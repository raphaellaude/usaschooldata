{% if school_year in ('sy1415', 'sy1516') %}

SELECT
    {% for col, alias in mapping.items() %}
    "{{ col }}" AS {{ alias }},
    {% endfor %}
    CASE
        WHEN substr(column_code, 1, 2) = 'AS' THEN 'Asian'
        WHEN substr(column_code, 1, 2) = 'HP' THEN 'Native Hawaiian or Other Pacific Islander'
        WHEN substr(column_code, 1, 2) = 'AM' THEN 'American Indian or Alaska Native'
        WHEN substr(column_code, 1, 2) = 'TR' THEN 'Two or more races'
        WHEN substr(column_code, 1, 2) = 'BL' THEN 'Black or African American'
        WHEN substr(column_code, 1, 2) = 'HI' THEN 'Hispanic/Latino'
        WHEN substr(column_code, 1, 2) = 'WH' THEN 'White'
        ELSE 'No Category Codes'
    END AS race_ethnicity,
    CASE
        WHEN substr(column_code, 3, 2) = 'PK' THEN 'Pre-Kindergarten'
        WHEN substr(column_code, 3, 2) = 'KG' THEN 'Kindergarten'
        WHEN substr(column_code, 3, 2) = '01' THEN 'Grade 1'
        WHEN substr(column_code, 3, 2) = '02' THEN 'Grade 2'
        WHEN substr(column_code, 3, 2) = '03' THEN 'Grade 3'
        WHEN substr(column_code, 3, 2) = '04' THEN 'Grade 4'
        WHEN substr(column_code, 3, 2) = '05' THEN 'Grade 5'
        WHEN substr(column_code, 3, 2) = '06' THEN 'Grade 6'
        WHEN substr(column_code, 3, 2) = '07' THEN 'Grade 7'
        WHEN substr(column_code, 3, 2) = '08' THEN 'Grade 8'
        WHEN substr(column_code, 3, 2) = '09' THEN 'Grade 9'
        WHEN substr(column_code, 3, 2) = '10' THEN 'Grade 10'
        WHEN substr(column_code, 3, 2) = '11' THEN 'Grade 11'
        WHEN substr(column_code, 3, 2) = '12' THEN 'Grade 12'
        WHEN substr(column_code, 3, 2) = '13' THEN 'Grade 13'
        WHEN substr(column_code, 3, 2) = 'UG' THEN 'Ungraded'
        WHEN substr(column_code, 3, 2) = 'AE' THEN 'Adult Education'
        WHEN substr(column_code, 3, 2) = 'AL' THEN 'No Category Codes' -- All students.
        ELSE 'No Category Codes'
    END AS grade,
    CASE
        WHEN substr(column_code, 5, 1) = 'F' THEN 'Female'
        WHEN substr(column_code, 5, 1) = 'M' THEN 'Male'
        ELSE 'No Category Codes'
    END AS sex,
    IF(student_count < 0, null, student_count) AS student_count,
    'Education Unit Total' AS total_indicator,
    'Reported' AS dms_flag
FROM
    read_csv('{{ file_path }}')
    UNPIVOT (student_count for column_code in (
        AMPKM,AMPKF,ASPKM,ASPKF,HIPKM,HIPKF,BLPKM,BLPKF,WHPKM,WHPKF,HPPKM,HPPKF,TRPKM,TRPKF,AMKGM,AMKGF,ASKGM,ASKGF,HIKGM,HIKGF,BLKGM,BLKGF,WHKGM,WHKGF,HPKGM,HPKGF,TRKGM,TRKGF,AM01M,AM01F,AS01M,AS01F,HI01M,HI01F,BL01M,BL01F,WH01M,WH01F,HP01M,HP01F,TR01M,TR01F,AM02M,AM02F,AS02M,AS02F,HI02M,HI02F,BL02M,BL02F,WH02M,WH02F,HP02M,HP02F,TR02M,TR02F,AM03M,AM03F,AS03M,AS03F,HI03M,HI03F,BL03M,BL03F,WH03M,WH03F,HP03M,HP03F,TR03M,TR03F,AM04M,AM04F,AS04M,AS04F,HI04M,HI04F,BL04M,BL04F,WH04M,WH04F,HP04M,HP04F,TR04M,TR04F,AM05M,AM05F,AS05M,AS05F,HI05M,HI05F,BL05M,BL05F,WH05M,WH05F,HP05M,HP05F,TR05M,TR05F,AM06M,AM06F,AS06M,AS06F,HI06M,HI06F,BL06M,BL06F,WH06M,WH06F,HP06M,HP06F,TR06M,TR06F,AM07M,AM07F,AS07M,AS07F,HI07M,HI07F,BL07M,BL07F,WH07M,WH07F,HP07M,HP07F,TR07M,TR07F,AM08M,AM08F,AS08M,AS08F,HI08M,HI08F,BL08M,BL08F,WH08M,WH08F,HP08M,HP08F,TR08M,TR08F,AM09M,AM09F,AS09M,AS09F,HI09M,HI09F,BL09M,BL09F,WH09M,WH09F,HP09M,HP09F,TR09M,TR09F,AM10M,AM10F,AS10M,AS10F,HI10M,HI10F,BL10M,BL10F,WH10M,WH10F,HP10M,HP10F,TR10M,TR10F,AM11M,AM11F,AS11M,AS11F,HI11M,HI11F,BL11M,BL11F,WH11M,WH11F,HP11M,HP11F,TR11M,TR11F,AM12M,AM12F,AS12M,AS12F,HI12M,HI12F,BL12M,BL12F,WH12M,WH12F,HP12M,HP12F,TR12M,TR12F,AM13M,AM13F,AS13M,AS13F,HI13M,HI13F,BL13M,BL13F,WH13M,WH13F,HP13M,HP13F,TR13M,TR13F,AMUGM,AMUGF,ASUGM,ASUGF,HIUGM,HIUGF,BLUGM,BLUGF,WHUGM,WHUGF,HPUGM,HPUGF,TRUGM,TRUGF,AMAEM,AMAEF,ASAEM,ASAEF,HIAEM,HIAEF,BLAEM,BLAEF,WHAEM,WHAEF,HPAEM,HPAEF,TRAEM,TRAEF,AM,AMALM,AMALF,"AS",ASALM,ASALF,HI,HIALM,HIALF,BL,BLALM,BLALF,WH,WHALM,WHALF,HP,HPALM,HPALF,TR,TRALM,TRALF
    ));

{% else %}

SELECT
    {% for col, alias in mapping.items() %}
    "{{ col }}" AS {{ alias }},
    {% endfor %}
FROM
    read_csv('{{ file_path }}');

{% endif %}
