# Stage 1: Build
# Using standard Gradle image with better layer caching
FROM gradle:8.9-jdk17 AS builder
WORKDIR /app
# Copy dependency files first for better caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle/
# Download dependencies (this layer will be cached if dependencies don't change)
RUN gradle dependencies --no-daemon || true
# Copy source files
COPY src ./src
# Build the application
RUN gradle bootJar --no-daemon

# Stage 2: Runtime
# Using standard Eclipse Temurin JRE
FROM eclipse-temurin:17-jre
WORKDIR /app
# Create non-root user for security
RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 2000

ENTRYPOINT ["java","-Xms256m","-Xmx512m","-XX:+UseContainerSupport","-XX:MaxMetaspaceSize=128m","-jar","app.jar"]
