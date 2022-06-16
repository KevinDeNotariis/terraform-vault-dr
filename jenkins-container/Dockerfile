FROM centos:7

RUN yum install -y make gcc unzip

### INSTALL Python3.8
RUN yum install -y zlib-devel && \
    yum install openssl-devel -y && \
    yum install libffi-devel -y && \
    yum install bzip2-devel -y

RUN curl -O https://www.python.org/ftp/python/3.8.1/Python-3.8.1.tgz && \
    tar -xzf Python-3.8.1.tgz && \
    cd Python-3.8.1/ && \
    ./configure --enable-optimizations && \
    make altinstall && \
    python3.8 --version

## Cleanup Python3.8
RUN rm -rf Python-3.8.1*

## Install pip
RUN yum install -y python3-pip

## Install GIT
RUN yum install -y git

## Upgrade pip and install setuptools
RUN /usr/local/bin/pip3.8 install --upgrade pip && /usr/local/bin/pip3.8 install --upgrade setuptools

# Link python to python3.8 and create a link for python3
RUN ln -s /usr/local/bin/python3.8 /usr/local/bin/python && \
    ln -s /usr/local/bin/python3.8 /usr/local/bin/python3

ENV PATH=/usr/local/go/bin:$PATH