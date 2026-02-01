SELECT
    {% for col, alias in mapping.items() %}
    {% if alias == 'sch_level' %}
    -- Normalize school level: map numeric codes to text and standardize case
    CASE "{{ col }}"
        -- Numeric codes from pre-2016-2017 data
        WHEN '1' THEN 'Elementary'
        WHEN '2' THEN 'Middle'
        WHEN '3' THEN 'High'
        WHEN '4' THEN 'Other'
        WHEN 'N' THEN 'Not reported'
        -- Case normalization
        WHEN 'Not Reported' THEN 'Not reported'
        WHEN 'Not Applicable' THEN 'Not applicable'
        ELSE "{{ col }}"
    END AS {{ alias }},
    {% else %}
    "{{ col }}" AS {{ alias }},
    {% endif %}
    {% endfor %}
FROM
    read_csv('{{ file_path }}', sample_size=-1);
