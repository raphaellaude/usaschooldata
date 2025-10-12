FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies for GDAL, Tippecanoe, 7z
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    build-essential \
    git \
    pkg-config \
    libproj-dev \
    proj-data \
    proj-bin \
    p7zip-full \
    && rm -rf /var/lib/apt/lists/*

# Set the environment variable for GDAL
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Install Tippecanoe
RUN git clone https://github.com/felt/tippecanoe.git /tippecanoe \
    && cd /tippecanoe \
    && make -j \
    && make install \
    && rm -rf /tippecanoe

ADD . /elt

# Sync the project into a new environment, asserting the lockfile is up to date
WORKDIR /elt
RUN uv sync --locked
