FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/target/grader-0.1.0-SNAPSHOT-shaded.jar app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
