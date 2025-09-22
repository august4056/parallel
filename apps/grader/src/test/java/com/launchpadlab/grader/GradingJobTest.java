package com.launchpadlab.grader;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.launchpadlab.grader.model.GradingResult;
import com.launchpadlab.grader.model.SubmissionPayload;
import org.junit.jupiter.api.Test;

class GradingJobTest {
  @Test
  void returnsPlaceholderResult() {
    SubmissionPayload payload = new SubmissionPayload("sub-123", "assign-456", "https://example.com/repo", "user-789");
    GradingJob job = new GradingJob();

    GradingResult result = job.run(payload);

    assertEquals(payload.submissionId(), result.submissionId());
    assertFalse(result.passed());
    assertEquals(0.0, result.totalScore());
  }
}
