FROM ubuntu:latest

# Install dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get install -y pgrep && \
    apt-get clean

# Create a non-privileged user (recommended for security)
RUN useradd -ms /bin/bash appuser

# Switch to the non-privileged user
USER appuser

# Create a directory for your video files (optional)
WORKDIR /home/appuser/videos


CMD ["/bin/bash", "-c", "ffmpeg -version && while true; do sleep 3600; done"]