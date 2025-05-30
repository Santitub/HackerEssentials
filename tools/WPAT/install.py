#!/usr/bin/env python3

import os
import sys
import subprocess

DEPENDENCIES = [
    "pipx",
    "colorama",
    "requests",
    "beautifulsoup4",
    "tqdm",
    "pyqt5",
    "pyqtwebengine",
    "urllib3"
]

def run_command(command, shell=False):
    """Run a shell command and print output."""
    try:
        subprocess.run(command, check=True, shell=shell)
    except subprocess.CalledProcessError as e:
        print(f"Error while running command: {command}\n{e}")
        sys.exit(1)

def install_dependencies():
    print("Installing Python dependencies...")
    for package in DEPENDENCIES:
        run_command([sys.executable, "-m", "pip", "install", package])

def setup_pipx_and_install_wpat():
    print("\nSetting up pipx and installing WPAT...")
    run_command([sys.executable, "-m", "pipx", "ensurepath"])
    run_command(["pipx", "install", "git+https://github.com/Santitub/WPAT.git"])

def main():
    print("Installing Python tool...")
    install_dependencies()
    setup_pipx_and_install_wpat()
    print("Python tool installed successfully!")

if __name__ == "__main__":
    main()
