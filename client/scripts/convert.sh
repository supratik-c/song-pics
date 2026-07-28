#!/usr/bin/env bash

set -euo pipefail

if ! command -v cwebp >/dev/null 2>&1; then
  echo "Error: cwebp is not installed or is not on PATH." >&2
  exit 1
fi

if ! command -v webpinfo >/dev/null 2>&1; then
  echo "Error: webpinfo is not installed or is not on PATH." >&2
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
  source_files=(
    "$puzzle_directory"/*.png
    "$puzzle_directory"/*.jpg
    "$puzzle_directory"/*.jpeg
    "$puzzle_directory"/*.webp
  )

  for source_file in "${source_files[@]}"; do
    webp_file="${source_file%.*}.webp"
    temporary_file="$webp_file.tmp"
    source_extension="${source_file##*.}"

    if [[ "$source_extension" == "webp" ]]; then
      if ! image_info="$(webpinfo -summary "$source_file" 2>/dev/null)"; then
        echo "Error: could not inspect WebP file: $source_file" >&2
        exit 1
      fi

      width="$(awk '/^  Width:/ { print $2; exit }' <<< "$image_info")"
      height="$(awk '/^  Height:/ { print $2; exit }' <<< "$image_info")"

      if [[ -z "$width" || -z "$height" ]]; then
        echo "Error: could not determine WebP dimensions: $source_file" >&2
        exit 1
      fi

      if [[ "$width" == 800 && "$height" == 600 ]]; then
        continue
      fi
    elif [[ -e "$webp_file" ]]; then
      echo "Error: refusing to overwrite existing file: $webp_file" >&2
      exit 1
    fi

    echo "Converting ${source_file#"$puzzles_directory/"}..."

    if ! cwebp \
      -quiet \
      -mt \
      -preset drawing \
      -m 6 \
      -q 82 \
      -resize 800 600 \
      "$source_file" \
      -o "$temporary_file"; then
      rm -f -- "$temporary_file"
      echo "Error: conversion failed; original source image was kept." >&2
      exit 1
    fi

    if [[ ! -s "$temporary_file" ]]; then
      rm -f -- "$temporary_file"
      echo "Error: cwebp produced an empty file; original source image was kept." >&2
      exit 1
    fi

    if ! converted_info="$(webpinfo -summary "$temporary_file" 2>/dev/null)"; then
      rm -f -- "$temporary_file"
      echo "Error: converted WebP could not be validated; original source image was kept." >&2
      exit 1
    fi

    converted_width="$(awk '/^  Width:/ { print $2; exit }' <<< "$converted_info")"
    converted_height="$(awk '/^  Height:/ { print $2; exit }' <<< "$converted_info")"

    if [[ "$converted_width" != 800 || "$converted_height" != 600 ]]; then
      rm -f -- "$temporary_file"
      echo "Error: converted WebP is not 800x600; original source image was kept." >&2
      exit 1
    fi

    mv -- "$temporary_file" "$webp_file"

    if [[ "$source_file" != "$webp_file" ]]; then
      rm -- "$source_file"
      echo "Created $(basename -- "$webp_file") and deleted $(basename -- "$source_file")."
    else
      echo "Resized $(basename -- "$source_file") to 800x600."
    fi

    ((converted_count += 1))
  done
done

if (( converted_count == 0 )); then
  echo "No PNG or JPEG files or non-800x600 WebP files found."
else
  echo "Converted $converted_count source image file(s)."
fi
