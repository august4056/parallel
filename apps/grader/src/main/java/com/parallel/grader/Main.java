package com.parallel.grader;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;
import org.yaml.snakeyaml.DumperOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class Main {
  private static final Logger log = LoggerFactory.getLogger(Main.class);
  private static final ObjectMapper json = new ObjectMapper();
  private static final OkHttpClient http = new OkHttpClient.Builder()
      .callTimeout(java.time.Duration.ofSeconds(30))
      .build();

  record Submission(String id, String assignmentId, String userId, String repoUrl, String status) {}

  static class Rubric {
    public String baseUrl; // Base URL to test against (e.g., deployed app of the student)
    public List<TestCase> tests;
  }
  static class TestCase {
    public String name;
    public String method;
    public String path;
    public Integer expectStatus;
    public Integer points;
    public Map<String, String> headers;
    public String body; // optional JSON string
  }
  static class TestResult {
    public String name;
    public boolean passed;
    public int pointsAwarded;
    public int expectedStatus;
    public int actualStatus;
    public String message;
  }
  static class GradeOutput {
    public int totalScore;
    public List<TestResult> items = new ArrayList<>();
    public String feedback;
    public String gradedAt;
  }

  public static void main(String[] args) throws Exception {
    // Config
    final String supabaseUrl = getenvRequired("SUPABASE_URL");
    final String supabaseKey = getenvRequired("SUPABASE_SERVICE_ROLE_KEY");
    final String bucket = getenvRequired("STORAGE_BUCKET");
    final String rubricPath = System.getenv().getOrDefault("RUBRIC_PATH", "rubrics/sample_api.yaml");
    final int batchSize = resolveBatchSize(args, System.getenv("BATCH_SIZE"));

    log.info("Starting grader. batchSize={} rubricPath={} bucket={}", batchSize, rubricPath, bucket);

    final Rubric rubric = loadRubric(rubricPath);
    if (rubric.baseUrl == null || rubric.baseUrl.isBlank()) {
      log.warn("Rubric baseUrl is not set. Tests may fail if they target relative endpoints.");
    }

    // Fetch queued submissions
    List<Submission> submissions = fetchQueuedSubmissions(supabaseUrl, supabaseKey, batchSize);
    log.info("Fetched {} queued submissions", submissions.size());

    for (Submission s : submissions) {
      try {
        // Mark RUNNING
        updateSubmission(supabaseUrl, supabaseKey, s.id, Map.of(
            "status", "RUNNING",
            "updatedAt", Instant.now().toString()
        ));

        // Download repo ZIP (best-effort)
        Path workDir = Files.createTempDirectory("grading-" + s.id + "-");
        try {
          Path zipPath = workDir.resolve("repo.zip");
          downloadZipBestEffort(s.repoUrl, zipPath);
          unzip(zipPath, workDir.resolve("repo"));
        } catch (Exception ex) {
          log.warn("Failed to download/unzip repo for {}: {}", s.id, ex.toString());
        }

        // Run rubric tests
        GradeOutput result = runRubric(rubric);

        // Upload grade JSON to storage
        String objectPath = "grades/" + s.id + ".json";
        uploadToStorage(supabaseUrl, supabaseKey, bucket, objectPath, json.writeValueAsBytes(result));

        // Determine status
        String finalStatus = result.items.stream().allMatch(r -> r.passed) ? "PASSED" : "FAILED";

        // Update submission and insert grade row
        updateSubmission(supabaseUrl, supabaseKey, s.id, Map.of(
            "status", finalStatus,
            "score", result.totalScore,
            "feedback", truncate(result.feedback, 1000),
            "updatedAt", Instant.now().toString()
        ));
        insertGrade(supabaseUrl, supabaseKey, s.id, result);

        log.info("Graded submission {} -> status={} score={}", s.id, finalStatus, result.totalScore);
      } catch (Exception e) {
        log.error("Error grading submission {}: {}", s.id, e.toString());
        try {
          updateSubmission(supabaseUrl, supabaseKey, s.id, Map.of(
              "status", "FAILED",
              "feedback", truncate("Grading error: " + e.getMessage(), 1000),
              "updatedAt", Instant.now().toString()
          ));
        } catch (Exception ignored) {
        }
      }
    }
  }

  static int resolveBatchSize(String[] args, String env) {
    if (args != null && args.length > 0) {
      try { return Integer.parseInt(args[0]); } catch (NumberFormatException ignored) {}
    }
    if (env != null) {
      try { return Integer.parseInt(env); } catch (NumberFormatException ignored) {}
    }
    return 5;
  }

  static String getenvRequired(String key) {
    String v = System.getenv(key);
    if (v == null || v.isBlank()) throw new IllegalArgumentException("Missing env: " + key);
    return v;
  }

  static Rubric loadRubric(String path) throws IOException {
    Yaml yaml = new Yaml(new Constructor(Rubric.class));
    try (InputStream in = Files.newInputStream(Path.of(path))) {
      return yaml.load(in);
    }
  }

  static List<Submission> fetchQueuedSubmissions(String base, String key, int limit) throws IOException {
    HttpUrl url = HttpUrl.parse(base + "/rest/v1/submissions").newBuilder()
        .addQueryParameter("status", "eq.QUEUED")
        .addQueryParameter("order", "createdAt.asc")
        .addQueryParameter("limit", Integer.toString(limit))
        .build();
    Request req = new Request.Builder()
        .url(url)
        .get()
        .addHeader("apikey", key)
        .addHeader("Authorization", "Bearer " + key)
        .build();
    try (Response res = http.newCall(req).execute()) {
      if (!res.isSuccessful()) throw new IOException("Fetch queued failed: " + res);
      String body = Objects.requireNonNull(res.body()).string();
      return json.readValue(body, new TypeReference<List<Submission>>(){});
    }
  }

  static void updateSubmission(String base, String key, String id, Map<String, Object> patch) throws IOException {
    HttpUrl url = HttpUrl.parse(base + "/rest/v1/submissions").newBuilder()
        .addQueryParameter("id", "eq." + id)
        .build();
    Request req = new Request.Builder()
        .url(url)
        .patch(RequestBody.create(json.writeValueAsBytes(patch), MediaType.parse("application/json")))
        .addHeader("apikey", key)
        .addHeader("Authorization", "Bearer " + key)
        .addHeader("Prefer", "return=minimal")
        .build();
    try (Response res = http.newCall(req).execute()) {
      if (!res.isSuccessful()) throw new IOException("Update submission failed: " + res);
    }
  }

  static void insertGrade(String base, String key, String submissionId, GradeOutput result) throws IOException {
    Map<String, Object> row = new HashMap<>();
    row.put("submissionId", submissionId);
    row.put("rubric", result.items); // store test results as rubric detail
    row.put("totalScore", result.totalScore);
    row.put("gradedAt", Instant.now().toString());

    Request req = new Request.Builder()
        .url(base + "/rest/v1/grades")
        .post(RequestBody.create(json.writeValueAsBytes(List.of(row)), MediaType.parse("application/json")))
        .addHeader("apikey", key)
        .addHeader("Authorization", "Bearer " + key)
        .addHeader("Prefer", "return=minimal")
        .build();
    try (Response res = http.newCall(req).execute()) {
      if (!res.isSuccessful()) throw new IOException("Insert grade failed: " + res);
    }
  }

  static void uploadToStorage(String base, String key, String bucket, String objectPath, byte[] bytes) throws IOException {
    // POST /storage/v1/object/{bucket}/{object}
    Request req = new Request.Builder()
        .url(base + "/storage/v1/object/" + encodePath(bucket) + "/" + encodePath(objectPath))
        .post(RequestBody.create(bytes))
        .addHeader("apikey", key)
        .addHeader("Authorization", "Bearer " + key)
        .addHeader("Content-Type", "application/json")
        .build();
    try (Response res = http.newCall(req).execute()) {
      if (!res.isSuccessful()) throw new IOException("Upload storage failed: " + res);
    }
  }

  static String encodePath(String p) {
    return URI.create("http://x/" + p).getRawPath().substring(1);
  }

  static void downloadZipBestEffort(String url, Path dest) throws IOException {
    // If not a .zip, try to guess GitHub archive URL
    String effective = url;
    if (!url.endsWith(".zip") && url.contains("github.com")) {
      // Convert https://github.com/org/repo to archive of main
      String trimmed = url.replaceAll("/+$", "");
      if (!trimmed.contains("/archive/")) {
        effective = trimmed + "/archive/refs/heads/main.zip";
      }
    }
    Request req = new Request.Builder().url(effective).build();
    try (Response res = http.newCall(req).execute()) {
      if (!res.isSuccessful()) throw new IOException("Download failed: " + res);
      byte[] data = Objects.requireNonNull(res.body()).bytes();
      Files.write(dest, data);
    }
  }

  static void unzip(Path zip, Path outDir) throws IOException {
    Files.createDirectories(outDir);
    try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(Files.newInputStream(zip)))) {
      ZipEntry entry;
      while ((entry = zis.getNextEntry()) != null) {
        Path out = outDir.resolve(entry.getName()).normalize();
        if (!out.startsWith(outDir)) throw new IOException("Zip traversal detected");
        if (entry.isDirectory()) {
          Files.createDirectories(out);
        } else {
          Files.createDirectories(out.getParent());
          try (OutputStream os = Files.newOutputStream(out)) {
            zis.transferTo(os);
          }
        }
      }
    }
  }

  static GradeOutput runRubric(Rubric rubric) throws IOException {
    GradeOutput out = new GradeOutput();
    out.feedback = "";
    out.gradedAt = Instant.now().toString();

    int total = 0;
    for (TestCase t : rubric.tests) {
      TestResult r = new TestResult();
      r.name = t.name != null ? t.name : t.method + " " + t.path;
      r.expectedStatus = t.expectStatus != null ? t.expectStatus : 200;
      r.pointsAwarded = 0;
      try {
        HttpUrl.Builder b = HttpUrl.parse((rubric.baseUrl != null ? rubric.baseUrl : "")).newBuilder()
            .encodedPath(t.path);
        Request.Builder req = new Request.Builder().url(b.build());
        String method = t.method == null ? "GET" : t.method.toUpperCase(Locale.ROOT);
        Map<String, String> headers = t.headers != null ? t.headers : Map.of();
        headers.forEach(req::addHeader);
        if (Objects.equals(method, "GET") || Objects.equals(method, "DELETE")) {
          if (Objects.equals(method, "GET")) req.get(); else req.delete();
        } else {
          MediaType mt = MediaType.parse(headers.getOrDefault("Content-Type", "application/json"));
          RequestBody body = RequestBody.create((t.body != null ? t.body : "").getBytes(StandardCharsets.UTF_8), mt);
          switch (method) {
            case "POST" -> req.post(body);
            case "PUT" -> req.put(body);
            case "PATCH" -> req.patch(body);
            default -> req.method(method, body);
          }
        }
        try (Response res = http.newCall(req.build()).execute()) {
          int code = res.code();
          r.actualStatus = code;
          r.passed = (code == r.expectedStatus);
          if (r.passed) {
            r.pointsAwarded = t.points != null ? t.points : 0;
            total += r.pointsAwarded;
          } else {
            r.message = "Expected " + r.expectedStatus + " got " + code;
          }
        }
      } catch (Exception ex) {
        r.passed = false;
        r.actualStatus = -1;
        r.message = ex.getMessage();
      }
      out.items.add(r);
    }
    out.totalScore = total;
    out.feedback = summarize(out.items);
    return out;
  }

  static String summarize(List<TestResult> items) {
    long ok = items.stream().filter(tr -> tr.passed).count();
    return ok + "/" + items.size() + " tests passed";
  }

  static String truncate(String s, int max) {
    if (s == null) return null;
    if (s.length() <= max) return s;
    return s.substring(0, max);
  }
}
