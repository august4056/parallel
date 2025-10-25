# syntax=docker/dockerfile:1

# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -DskipTests package

# Runtime stage (distroless)
FROM gcr.io/distroless/java17-debian12
WORKDIR /app
COPY --from=build /workspace/target/grader-0.1.0.jar /app/grader.jar
COPY rubrics /app/rubrics
USER nonroot
ENTRYPOINT ["/usr/bin/java", "-jar", "/app/grader.jar"]
