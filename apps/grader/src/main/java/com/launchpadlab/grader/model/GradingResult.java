package com.launchpadlab.grader.model;

public record GradingResult(String submissionId, boolean passed, double totalScore, String feedback) {}
