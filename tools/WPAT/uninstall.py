#!/usr/bin/env python3

import os
import sys
import subprocess

DEPENDENCIES = [
    "colorama",
    "requests",
    "beautifulsoup4",
    "tqdm",
    "pyqt5",
    "pyqtwebengine",
    "urllib3"
]

def run_command(command):
    """Run a shell command and handle errors gracefully."""
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not uninstall {command[-1]} — it may be a system package or already removed.")

def remove_dependencies():
    print("Removing Python dependencies...")
    for package in DEPENDENCIES:
        run_command([sys.executable, "-m", "pip", "uninstall", "-y", package])

    print("\nUninstalling WPAT from pipx...")
    run_command(["pipx", "uninstall", "wpat"])

def main():
    print("Uninstalling Python tool...")
    remove_dependencies()
    print("Python tool uninstalled successfully!")

if __name__ == "__main__":
    main()
