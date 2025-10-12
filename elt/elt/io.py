import subprocess
from pathlib import Path
from zipfile import ZipFile, BadZipFile


def clean_csv_to_utf8(
    input_file: str, output_file: str | None = None, replace: bool = True
) -> None:
    """
    Remove non-UTF8 characters from a CSV file and save it as UTF-8.
    """
    if output_file is None:
        local_file_path = Path(input_file)
        output_file = "/tmp/" + local_file_path.stem + "utf8.csv"

    with (
        open(input_file, "rb") as infile,
        open(output_file, "w", encoding="utf-8", newline="") as outfile,
    ):
        for line_bytes in infile:
            try:
                line_str = line_bytes.decode("utf-8")
            except UnicodeDecodeError:
                line_str = line_bytes.decode("utf-8", errors="ignore")
            outfile.write(line_str)

    if replace:
        Path(input_file).unlink()
        Path(output_file).rename(input_file)


def recursive_unzip(
    local_file_path: str | Path, dest_dir: str | Path | None = None
) -> None:
    """
    Unzips a file and recursively unzips any zips found within the unzipped directory.
    Attempts to use Python's zipfile first, then falls back to 7z if that fails.

    Args:
        local_file_path: Path to the file to be unzipped.
        dest_dir: Destination directory for extraction. If None, extracts to
                  a directory named after the zip file (without extension) in
                  the same location as the zip file.

    Raises:
        Exception: If both zipfile and 7z extraction attempts fail.
    """
    local_file_path = Path(local_file_path)

    if dest_dir is None:
        unzipped_dir = local_file_path.parent / local_file_path.stem
    else:
        unzipped_dir = Path(dest_dir)

    unzipped_dir.mkdir(parents=True, exist_ok=True)

    try:
        with ZipFile(local_file_path) as zip_file:
            zip_file.extractall(unzipped_dir)
    except (BadZipFile, Exception) as e:
        try:
            _ = subprocess.run(
                ["7z", "x", str(local_file_path), f"-o{unzipped_dir}", "-y"],
                capture_output=True,
                text=True,
                check=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as e7z:
            raise Exception(
                f"Failed to unzip {local_file_path}. Zipfile error: {e}. 7z error: {e7z}"
            )

    for nested_zip in unzipped_dir.rglob("*.zip"):
        recursive_unzip(nested_zip)
