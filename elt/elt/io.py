import click


@click.command()
@click.argument("input_file", type=click.Path(exists=True))
@click.argument("output_file", type=click.Path())
def clean_csv_to_utf8(input_file: str, output_file: str) -> None:
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


if __name__ == "__main__":
    clean_csv_to_utf8()
