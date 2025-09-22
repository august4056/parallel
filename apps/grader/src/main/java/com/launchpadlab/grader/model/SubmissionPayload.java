package com.launchpadlab.grader.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;

public record SubmissionPayload(String submissionId, String assignmentId, String repoUrl, String userId) {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  public static SubmissionPayload fromJson(String json) throws IOException {
    return OBJECT_MAPPER.readValue(json, SubmissionPayload.class);
  }
}
