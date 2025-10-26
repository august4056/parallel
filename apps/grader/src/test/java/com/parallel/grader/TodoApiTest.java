package com.parallel.grader;

import okhttp3.*;
import org.junit.jupiter.api.*;

import java.io.IOException;
import java.time.Duration;

import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.junit.jupiter.api.Assertions.*;

public class TodoApiTest {
  static OkHttpClient client;
  static String base;

  @BeforeAll
  static void setup() {
    client = new OkHttpClient.Builder().callTimeout(Duration.ofSeconds(10)).build();
    base = System.getenv().getOrDefault("TODO_API_BASE", "");
    assumeTrue(base != null && !base.isBlank(), "Set TODO_API_BASE to run Todo API tests");
  }

  @Test
  void listTodos_ok() throws IOException {
    Request req = new Request.Builder().url(base + "/todos").get().build();
    try (Response res = client.newCall(req).execute()) {
      assertEquals(200, res.code());
    }
  }

  @Test
  void getTodo_notFound() throws IOException {
    Request req = new Request.Builder().url(base + "/todos/00000000-0000-0000-0000-000000000000").get().build();
    try (Response res = client.newCall(req).execute()) {
      assertEquals(404, res.code());
    }
  }
}
