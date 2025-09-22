package com.launchpadlab.grader.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.launchpadlab.grader.model.GradingResult;
import com.launchpadlab.grader.model.SubmissionPayload;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ResultStorageService {
  private static final Logger LOGGER = LoggerFactory.getLogger(ResultStorageService.class);
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  public void persistResult(SubmissionPayload payload, GradingResult result) throws IOException {
    Map<String, Object> document =
        Map.of(
            "submissionId", payload.submissionId(),
            "assignmentId", payload.assignmentId(),
            "userId", payload.userId(),
            "generatedAt", Instant.now().toString(),
            "result", result);

    byte[] serialized = OBJECT_MAPPER.writeValueAsString(document).getBytes(StandardCharsets.UTF_8);

    // TODO: Push the serialized payload into Supabase Storage or another artifact store.
    LOGGER.info(
        "Persisted grading artifact for submission {} ({} bytes)",
        payload.submissionId(),
        serialized.length);
  }
}
