# ─── Stage 1 : Build ────────────────────────────────────────────────
# L'image officielle Gradle inclut le JDK 21 – on l'utilise pour compiler
FROM gradle:8.14-jdk21 AS build
WORKDIR /app

# Copie les fichiers de config Gradle en premier pour profiter du cache Docker :
# si seul le code source change, les dépendances ne sont pas re-téléchargées
COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon

# Copie le code source et génère le JAR exécutable
COPY src ./src
RUN gradle bootJar --no-daemon

# ─── Stage 2 : Runtime ──────────────────────────────────────────────
# Image légère avec uniquement le JRE (pas besoin du JDK en production)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl

# Copie uniquement le JAR produit par l'étape précédente
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=50s \
  CMD curl -fsS http://127.0.0.1:8080/actuator/health > /dev/null || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
