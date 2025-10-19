SELECT
    {% for col, alias in mapping.items() %}
    "{{ col }}" AS {{ alias }},
    {% endfor %}
FROM
    read_csv('{{ file_path }}', sample_size=-1);
