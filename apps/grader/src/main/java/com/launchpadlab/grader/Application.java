package com.launchpadlab.grader;

import com.launchpadlab.grader.model.GradingResult;
import com.launchpadlab.grader.model.SubmissionPayload;
import com.launchpadlab.grader.service.ResultStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class Application {
  private static final Logger LOGGER = LoggerFactory.getLogger(Application.class);

  private Application() {}

  public static void main(String[] args) throws Exception {
    final String payloadJson = System.getenv().getOrDefault("SUBMISSION_PAYLOAD", "");
    if (payloadJson.isBlank()) {
      throw new IllegalArgumentException("SUBMISSION_PAYLOAD environment variable is required");
    }

    SubmissionPayload payload = SubmissionPayload.fromJson(payloadJson);
    LOGGER.info("Starting grading for submission {}", payload.submissionId());

    GradingJob gradingJob = new GradingJob();
    ResultStorageService storageService = new ResultStorageService();

    GradingResult result = gradingJob.run(payload);
    storageService.persistResult(payload, result);

    LOGGER.info(
        "Grading complete for submission {} with score {}",
        payload.submissionId(),
        result.totalScore());
  }
}
