ARG REPO=https://github.com/symphonyoss/SymphonyElectron.git
ARG BRANCH=main

FROM ubuntu:latest

ARG REPO
ARG BRANCH

MAINTAINER Kiran Niranjan<kiran.niranjan@symphony.com>

# Update
RUN apt-get update

# Install dependencies
RUN apt-get install -y \
    curl \
    git \
    gcc \
    g++ \
    make \
    build-essential \
    libssl-dev \
    libx11-dev \
    libxkbfile-dev \
    libxtst-dev \
    libpng-dev \
    zlib1g-dev \
    rpm

# install node
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash
RUN apt-get install -y nodejs

# Clone specific branch and repo
RUN echo ${BRANCH} ${REPO}
RUN git clone -b ${BRANCH} ${REPO}
WORKDIR SymphonyElectron
CMD ["chmod +x scripts/build-linux.sh"]
CMD ["sh", "scripts/build-linux.sh"]
