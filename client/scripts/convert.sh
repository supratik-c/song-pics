#!/usr/bin/env bash

set -euo pipefail

if ! command -v cwebp >/dev/null 2>&1; then
  echo "Error: cwebp is not installed or is not on PATH." >&2
  exit 1
fi

if (( $# > 1 )); then
  echo "Usage: $0 [YYYY-MM-DD]" >&2
  exit 1
fi

client_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
puzzles_directory="$client_directory/content/puzzles"
puzzle_directories=()

shopt -s nullglob

if (( $# == 1 )); then
  puzzle_id="$1"

  if [[ ! "$puzzle_id" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "Usage: $0 [YYYY-MM-DD]" >&2
    exit 1
  fi

  puzzle_directory="$puzzles_directory/$puzzle_id"

  if [[ ! -d "$puzzle_directory" ]]; then
    echo "Error: puzzle directory does not exist: $puzzle_directory" >&2
    exit 1
  fi

  puzzle_directories+=("$puzzle_directory")
else
  for puzzle_directory in "$puzzles_directory"/*; do
    puzzle_id="$(basename -- "$puzzle_directory")"

    if [[ -d "$puzzle_directory" &&
      "$puzzle_id" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
      puzzle_directories+=("$puzzle_directory")
    fi
  done
fi

if (( ${#puzzle_directories[@]} == 0 )); then
  echo "No date-named puzzle directories found in $puzzles_directory"
  exit 0
fi

converted_count=0

for puzzle_directory in "${puzzle_directories[@]}"; do
  png_files=("$puzzle_directory"/*.png)

  for png_file in "${png_files[@]}"; do
    webp_file="${png_file%.png}.webp"
    temporary_file="$webp_file.tmp"

    if [[ -e "$webp_file" ]]; then
      echo "Error: refusing to overwrite existing file: $webp_file" >&2
      exit 1
    fi

    echo "Converting ${png_file#"$puzzles_directory/"}..."

    if ! cwebp \
      -quiet \
      -mt \
      -preset drawing \
      -m 6 \
      -q 82 \
      "$png_file" \
      -o "$temporary_file"; then
      rm -f -- "$temporary_file"
      echo "Error: conversion failed; original PNG was kept." >&2
      exit 1
    fi

    if [[ ! -s "$temporary_file" ]]; then
      rm -f -- "$temporary_file"
      echo "Error: cwebp produced an empty file; original PNG was kept." >&2
      exit 1
    fi

    mv -- "$temporary_file" "$webp_file"
    rm -- "$png_file"
    ((converted_count += 1))
    echo "Created $(basename -- "$webp_file") and deleted $(basename -- "$png_file")."
  done
done

if (( converted_count == 0 )); then
  echo "No PNG files found."
else
  echo "Converted $converted_count PNG file(s)."
fi
