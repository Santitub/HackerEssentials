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
    # pipx no se desinstala aquí directamente porque lo usamos abajo
]

def run_command(command, shell=False):
    """Run a shell command and print output."""
    try:
        subprocess.run(command, check=True, shell=shell)
    except subprocess.CalledProcessError as e:
        print(f"Error while running command: {command}\n{e}")
        sys.exit(1)

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
