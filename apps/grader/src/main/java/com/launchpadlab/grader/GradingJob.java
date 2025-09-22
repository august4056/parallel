package com.launchpadlab.grader;

import com.launchpadlab.grader.model.GradingResult;
import com.launchpadlab.grader.model.SubmissionPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class GradingJob {
  private static final Logger LOGGER = LoggerFactory.getLogger(GradingJob.class);

  public GradingResult run(SubmissionPayload payload) {
    LOGGER.info(
        "Evaluating repository {} for assignment {}",
        payload.repoUrl(),
        payload.assignmentId());

    // TODO: Clone the repository, run Maven verification, and capture detailed rubric data.
    boolean passed = false;
    double totalScore = 0.0;
    String feedback = "Autograder stub - implement Maven workflow.";

    return new GradingResult(payload.submissionId(), passed, totalScore, feedback);
  }
}
