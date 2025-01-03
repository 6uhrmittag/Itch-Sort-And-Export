#!/bin/bash

# Function to check if a program is installed
is_installed() {
    if ! command -v "$1" &> /dev/null
    then
        echo "$1 could not be found"
        return 1
    else
        echo "$1 is already installed"
        return 0
    fi
}

# Update and upgrade the system packages
echo "Updating repos..."
sudo apt-get update

# Check and Install Node.js and npm if not installed
if ! is_installed node || ! is_installed npm; then
    echo "Installing Node.js and npm..."
    sudo apt-get install nodejs npm -y
else
    echo "Node.js and npm are already installed."
fi

# Verify the installation of Node.js and npm
node -v
npm -v

# Check and Install web-ext if not installed
if ! is_installed web-ext; then
    echo "Installing web-ext..."
    sudo npm install --global web-ext
else
    echo "web-ext is already installed."
fi

# Verify the installation of web-ext
web-ext --version
