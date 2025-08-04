@echo off
echo ========================================
echo INJECTION GOOGLE PLACES PAR BATCH
echo ========================================
echo.

cd "C:\Users\diall\Documents\LokoTaxi"

set "DB_URL=postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"

echo Execution batch 1/161...
psql "%DB_URL%" -f batch_1_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 1
    pause
    exit /b 1
)
echo Batch 1 OK
echo.

echo Execution batch 2/161...
psql "%DB_URL%" -f batch_2_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 2
    pause
    exit /b 1
)
echo Batch 2 OK
echo.

echo Execution batch 3/161...
psql "%DB_URL%" -f batch_3_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 3
    pause
    exit /b 1
)
echo Batch 3 OK
echo.

echo Execution batch 4/161...
psql "%DB_URL%" -f batch_4_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 4
    pause
    exit /b 1
)
echo Batch 4 OK
echo.

echo Execution batch 5/161...
psql "%DB_URL%" -f batch_5_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 5
    pause
    exit /b 1
)
echo Batch 5 OK
echo.

echo Execution batch 6/161...
psql "%DB_URL%" -f batch_6_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 6
    pause
    exit /b 1
)
echo Batch 6 OK
echo.

echo Execution batch 7/161...
psql "%DB_URL%" -f batch_7_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 7
    pause
    exit /b 1
)
echo Batch 7 OK
echo.

echo Execution batch 8/161...
psql "%DB_URL%" -f batch_8_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 8
    pause
    exit /b 1
)
echo Batch 8 OK
echo.

echo Execution batch 9/161...
psql "%DB_URL%" -f batch_9_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 9
    pause
    exit /b 1
)
echo Batch 9 OK
echo.

echo Execution batch 10/161...
psql "%DB_URL%" -f batch_10_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 10
    pause
    exit /b 1
)
echo Batch 10 OK
echo.

echo Execution batch 11/161...
psql "%DB_URL%" -f batch_11_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 11
    pause
    exit /b 1
)
echo Batch 11 OK
echo.

echo Execution batch 12/161...
psql "%DB_URL%" -f batch_12_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 12
    pause
    exit /b 1
)
echo Batch 12 OK
echo.

echo Execution batch 13/161...
psql "%DB_URL%" -f batch_13_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 13
    pause
    exit /b 1
)
echo Batch 13 OK
echo.

echo Execution batch 14/161...
psql "%DB_URL%" -f batch_14_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 14
    pause
    exit /b 1
)
echo Batch 14 OK
echo.

echo Execution batch 15/161...
psql "%DB_URL%" -f batch_15_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 15
    pause
    exit /b 1
)
echo Batch 15 OK
echo.

echo Execution batch 16/161...
psql "%DB_URL%" -f batch_16_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 16
    pause
    exit /b 1
)
echo Batch 16 OK
echo.

echo Execution batch 17/161...
psql "%DB_URL%" -f batch_17_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 17
    pause
    exit /b 1
)
echo Batch 17 OK
echo.

echo Execution batch 18/161...
psql "%DB_URL%" -f batch_18_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 18
    pause
    exit /b 1
)
echo Batch 18 OK
echo.

echo Execution batch 19/161...
psql "%DB_URL%" -f batch_19_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 19
    pause
    exit /b 1
)
echo Batch 19 OK
echo.

echo Execution batch 20/161...
psql "%DB_URL%" -f batch_20_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 20
    pause
    exit /b 1
)
echo Batch 20 OK
echo.

echo Execution batch 21/161...
psql "%DB_URL%" -f batch_21_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 21
    pause
    exit /b 1
)
echo Batch 21 OK
echo.

echo Execution batch 22/161...
psql "%DB_URL%" -f batch_22_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 22
    pause
    exit /b 1
)
echo Batch 22 OK
echo.

echo Execution batch 23/161...
psql "%DB_URL%" -f batch_23_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 23
    pause
    exit /b 1
)
echo Batch 23 OK
echo.

echo Execution batch 24/161...
psql "%DB_URL%" -f batch_24_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 24
    pause
    exit /b 1
)
echo Batch 24 OK
echo.

echo Execution batch 25/161...
psql "%DB_URL%" -f batch_25_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 25
    pause
    exit /b 1
)
echo Batch 25 OK
echo.

echo Execution batch 26/161...
psql "%DB_URL%" -f batch_26_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 26
    pause
    exit /b 1
)
echo Batch 26 OK
echo.

echo Execution batch 27/161...
psql "%DB_URL%" -f batch_27_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 27
    pause
    exit /b 1
)
echo Batch 27 OK
echo.

echo Execution batch 28/161...
psql "%DB_URL%" -f batch_28_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 28
    pause
    exit /b 1
)
echo Batch 28 OK
echo.

echo Execution batch 29/161...
psql "%DB_URL%" -f batch_29_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 29
    pause
    exit /b 1
)
echo Batch 29 OK
echo.

echo Execution batch 30/161...
psql "%DB_URL%" -f batch_30_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 30
    pause
    exit /b 1
)
echo Batch 30 OK
echo.

echo Execution batch 31/161...
psql "%DB_URL%" -f batch_31_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 31
    pause
    exit /b 1
)
echo Batch 31 OK
echo.

echo Execution batch 32/161...
psql "%DB_URL%" -f batch_32_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 32
    pause
    exit /b 1
)
echo Batch 32 OK
echo.

echo Execution batch 33/161...
psql "%DB_URL%" -f batch_33_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 33
    pause
    exit /b 1
)
echo Batch 33 OK
echo.

echo Execution batch 34/161...
psql "%DB_URL%" -f batch_34_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 34
    pause
    exit /b 1
)
echo Batch 34 OK
echo.

echo Execution batch 35/161...
psql "%DB_URL%" -f batch_35_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 35
    pause
    exit /b 1
)
echo Batch 35 OK
echo.

echo Execution batch 36/161...
psql "%DB_URL%" -f batch_36_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 36
    pause
    exit /b 1
)
echo Batch 36 OK
echo.

echo Execution batch 37/161...
psql "%DB_URL%" -f batch_37_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 37
    pause
    exit /b 1
)
echo Batch 37 OK
echo.

echo Execution batch 38/161...
psql "%DB_URL%" -f batch_38_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 38
    pause
    exit /b 1
)
echo Batch 38 OK
echo.

echo Execution batch 39/161...
psql "%DB_URL%" -f batch_39_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 39
    pause
    exit /b 1
)
echo Batch 39 OK
echo.

echo Execution batch 40/161...
psql "%DB_URL%" -f batch_40_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 40
    pause
    exit /b 1
)
echo Batch 40 OK
echo.

echo Execution batch 41/161...
psql "%DB_URL%" -f batch_41_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 41
    pause
    exit /b 1
)
echo Batch 41 OK
echo.

echo Execution batch 42/161...
psql "%DB_URL%" -f batch_42_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 42
    pause
    exit /b 1
)
echo Batch 42 OK
echo.

echo Execution batch 43/161...
psql "%DB_URL%" -f batch_43_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 43
    pause
    exit /b 1
)
echo Batch 43 OK
echo.

echo Execution batch 44/161...
psql "%DB_URL%" -f batch_44_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 44
    pause
    exit /b 1
)
echo Batch 44 OK
echo.

echo Execution batch 45/161...
psql "%DB_URL%" -f batch_45_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 45
    pause
    exit /b 1
)
echo Batch 45 OK
echo.

echo Execution batch 46/161...
psql "%DB_URL%" -f batch_46_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 46
    pause
    exit /b 1
)
echo Batch 46 OK
echo.

echo Execution batch 47/161...
psql "%DB_URL%" -f batch_47_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 47
    pause
    exit /b 1
)
echo Batch 47 OK
echo.

echo Execution batch 48/161...
psql "%DB_URL%" -f batch_48_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 48
    pause
    exit /b 1
)
echo Batch 48 OK
echo.

echo Execution batch 49/161...
psql "%DB_URL%" -f batch_49_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 49
    pause
    exit /b 1
)
echo Batch 49 OK
echo.

echo Execution batch 50/161...
psql "%DB_URL%" -f batch_50_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 50
    pause
    exit /b 1
)
echo Batch 50 OK
echo.

echo Execution batch 51/161...
psql "%DB_URL%" -f batch_51_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 51
    pause
    exit /b 1
)
echo Batch 51 OK
echo.

echo Execution batch 52/161...
psql "%DB_URL%" -f batch_52_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 52
    pause
    exit /b 1
)
echo Batch 52 OK
echo.

echo Execution batch 53/161...
psql "%DB_URL%" -f batch_53_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 53
    pause
    exit /b 1
)
echo Batch 53 OK
echo.

echo Execution batch 54/161...
psql "%DB_URL%" -f batch_54_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 54
    pause
    exit /b 1
)
echo Batch 54 OK
echo.

echo Execution batch 55/161...
psql "%DB_URL%" -f batch_55_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 55
    pause
    exit /b 1
)
echo Batch 55 OK
echo.

echo Execution batch 56/161...
psql "%DB_URL%" -f batch_56_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 56
    pause
    exit /b 1
)
echo Batch 56 OK
echo.

echo Execution batch 57/161...
psql "%DB_URL%" -f batch_57_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 57
    pause
    exit /b 1
)
echo Batch 57 OK
echo.

echo Execution batch 58/161...
psql "%DB_URL%" -f batch_58_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 58
    pause
    exit /b 1
)
echo Batch 58 OK
echo.

echo Execution batch 59/161...
psql "%DB_URL%" -f batch_59_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 59
    pause
    exit /b 1
)
echo Batch 59 OK
echo.

echo Execution batch 60/161...
psql "%DB_URL%" -f batch_60_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 60
    pause
    exit /b 1
)
echo Batch 60 OK
echo.

echo Execution batch 61/161...
psql "%DB_URL%" -f batch_61_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 61
    pause
    exit /b 1
)
echo Batch 61 OK
echo.

echo Execution batch 62/161...
psql "%DB_URL%" -f batch_62_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 62
    pause
    exit /b 1
)
echo Batch 62 OK
echo.

echo Execution batch 63/161...
psql "%DB_URL%" -f batch_63_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 63
    pause
    exit /b 1
)
echo Batch 63 OK
echo.

echo Execution batch 64/161...
psql "%DB_URL%" -f batch_64_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 64
    pause
    exit /b 1
)
echo Batch 64 OK
echo.

echo Execution batch 65/161...
psql "%DB_URL%" -f batch_65_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 65
    pause
    exit /b 1
)
echo Batch 65 OK
echo.

echo Execution batch 66/161...
psql "%DB_URL%" -f batch_66_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 66
    pause
    exit /b 1
)
echo Batch 66 OK
echo.

echo Execution batch 67/161...
psql "%DB_URL%" -f batch_67_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 67
    pause
    exit /b 1
)
echo Batch 67 OK
echo.

echo Execution batch 68/161...
psql "%DB_URL%" -f batch_68_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 68
    pause
    exit /b 1
)
echo Batch 68 OK
echo.

echo Execution batch 69/161...
psql "%DB_URL%" -f batch_69_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 69
    pause
    exit /b 1
)
echo Batch 69 OK
echo.

echo Execution batch 70/161...
psql "%DB_URL%" -f batch_70_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 70
    pause
    exit /b 1
)
echo Batch 70 OK
echo.

echo Execution batch 71/161...
psql "%DB_URL%" -f batch_71_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 71
    pause
    exit /b 1
)
echo Batch 71 OK
echo.

echo Execution batch 72/161...
psql "%DB_URL%" -f batch_72_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 72
    pause
    exit /b 1
)
echo Batch 72 OK
echo.

echo Execution batch 73/161...
psql "%DB_URL%" -f batch_73_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 73
    pause
    exit /b 1
)
echo Batch 73 OK
echo.

echo Execution batch 74/161...
psql "%DB_URL%" -f batch_74_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 74
    pause
    exit /b 1
)
echo Batch 74 OK
echo.

echo Execution batch 75/161...
psql "%DB_URL%" -f batch_75_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 75
    pause
    exit /b 1
)
echo Batch 75 OK
echo.

echo Execution batch 76/161...
psql "%DB_URL%" -f batch_76_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 76
    pause
    exit /b 1
)
echo Batch 76 OK
echo.

echo Execution batch 77/161...
psql "%DB_URL%" -f batch_77_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 77
    pause
    exit /b 1
)
echo Batch 77 OK
echo.

echo Execution batch 78/161...
psql "%DB_URL%" -f batch_78_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 78
    pause
    exit /b 1
)
echo Batch 78 OK
echo.

echo Execution batch 79/161...
psql "%DB_URL%" -f batch_79_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 79
    pause
    exit /b 1
)
echo Batch 79 OK
echo.

echo Execution batch 80/161...
psql "%DB_URL%" -f batch_80_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 80
    pause
    exit /b 1
)
echo Batch 80 OK
echo.

echo Execution batch 81/161...
psql "%DB_URL%" -f batch_81_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 81
    pause
    exit /b 1
)
echo Batch 81 OK
echo.

echo Execution batch 82/161...
psql "%DB_URL%" -f batch_82_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 82
    pause
    exit /b 1
)
echo Batch 82 OK
echo.

echo Execution batch 83/161...
psql "%DB_URL%" -f batch_83_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 83
    pause
    exit /b 1
)
echo Batch 83 OK
echo.

echo Execution batch 84/161...
psql "%DB_URL%" -f batch_84_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 84
    pause
    exit /b 1
)
echo Batch 84 OK
echo.

echo Execution batch 85/161...
psql "%DB_URL%" -f batch_85_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 85
    pause
    exit /b 1
)
echo Batch 85 OK
echo.

echo Execution batch 86/161...
psql "%DB_URL%" -f batch_86_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 86
    pause
    exit /b 1
)
echo Batch 86 OK
echo.

echo Execution batch 87/161...
psql "%DB_URL%" -f batch_87_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 87
    pause
    exit /b 1
)
echo Batch 87 OK
echo.

echo Execution batch 88/161...
psql "%DB_URL%" -f batch_88_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 88
    pause
    exit /b 1
)
echo Batch 88 OK
echo.

echo Execution batch 89/161...
psql "%DB_URL%" -f batch_89_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 89
    pause
    exit /b 1
)
echo Batch 89 OK
echo.

echo Execution batch 90/161...
psql "%DB_URL%" -f batch_90_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 90
    pause
    exit /b 1
)
echo Batch 90 OK
echo.

echo Execution batch 91/161...
psql "%DB_URL%" -f batch_91_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 91
    pause
    exit /b 1
)
echo Batch 91 OK
echo.

echo Execution batch 92/161...
psql "%DB_URL%" -f batch_92_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 92
    pause
    exit /b 1
)
echo Batch 92 OK
echo.

echo Execution batch 93/161...
psql "%DB_URL%" -f batch_93_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 93
    pause
    exit /b 1
)
echo Batch 93 OK
echo.

echo Execution batch 94/161...
psql "%DB_URL%" -f batch_94_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 94
    pause
    exit /b 1
)
echo Batch 94 OK
echo.

echo Execution batch 95/161...
psql "%DB_URL%" -f batch_95_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 95
    pause
    exit /b 1
)
echo Batch 95 OK
echo.

echo Execution batch 96/161...
psql "%DB_URL%" -f batch_96_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 96
    pause
    exit /b 1
)
echo Batch 96 OK
echo.

echo Execution batch 97/161...
psql "%DB_URL%" -f batch_97_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 97
    pause
    exit /b 1
)
echo Batch 97 OK
echo.

echo Execution batch 98/161...
psql "%DB_URL%" -f batch_98_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 98
    pause
    exit /b 1
)
echo Batch 98 OK
echo.

echo Execution batch 99/161...
psql "%DB_URL%" -f batch_99_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 99
    pause
    exit /b 1
)
echo Batch 99 OK
echo.

echo Execution batch 100/161...
psql "%DB_URL%" -f batch_100_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 100
    pause
    exit /b 1
)
echo Batch 100 OK
echo.

echo Execution batch 101/161...
psql "%DB_URL%" -f batch_101_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 101
    pause
    exit /b 1
)
echo Batch 101 OK
echo.

echo Execution batch 102/161...
psql "%DB_URL%" -f batch_102_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 102
    pause
    exit /b 1
)
echo Batch 102 OK
echo.

echo Execution batch 103/161...
psql "%DB_URL%" -f batch_103_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 103
    pause
    exit /b 1
)
echo Batch 103 OK
echo.

echo Execution batch 104/161...
psql "%DB_URL%" -f batch_104_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 104
    pause
    exit /b 1
)
echo Batch 104 OK
echo.

echo Execution batch 105/161...
psql "%DB_URL%" -f batch_105_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 105
    pause
    exit /b 1
)
echo Batch 105 OK
echo.

echo Execution batch 106/161...
psql "%DB_URL%" -f batch_106_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 106
    pause
    exit /b 1
)
echo Batch 106 OK
echo.

echo Execution batch 107/161...
psql "%DB_URL%" -f batch_107_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 107
    pause
    exit /b 1
)
echo Batch 107 OK
echo.

echo Execution batch 108/161...
psql "%DB_URL%" -f batch_108_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 108
    pause
    exit /b 1
)
echo Batch 108 OK
echo.

echo Execution batch 109/161...
psql "%DB_URL%" -f batch_109_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 109
    pause
    exit /b 1
)
echo Batch 109 OK
echo.

echo Execution batch 110/161...
psql "%DB_URL%" -f batch_110_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 110
    pause
    exit /b 1
)
echo Batch 110 OK
echo.

echo Execution batch 111/161...
psql "%DB_URL%" -f batch_111_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 111
    pause
    exit /b 1
)
echo Batch 111 OK
echo.

echo Execution batch 112/161...
psql "%DB_URL%" -f batch_112_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 112
    pause
    exit /b 1
)
echo Batch 112 OK
echo.

echo Execution batch 113/161...
psql "%DB_URL%" -f batch_113_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 113
    pause
    exit /b 1
)
echo Batch 113 OK
echo.

echo Execution batch 114/161...
psql "%DB_URL%" -f batch_114_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 114
    pause
    exit /b 1
)
echo Batch 114 OK
echo.

echo Execution batch 115/161...
psql "%DB_URL%" -f batch_115_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 115
    pause
    exit /b 1
)
echo Batch 115 OK
echo.

echo Execution batch 116/161...
psql "%DB_URL%" -f batch_116_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 116
    pause
    exit /b 1
)
echo Batch 116 OK
echo.

echo Execution batch 117/161...
psql "%DB_URL%" -f batch_117_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 117
    pause
    exit /b 1
)
echo Batch 117 OK
echo.

echo Execution batch 118/161...
psql "%DB_URL%" -f batch_118_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 118
    pause
    exit /b 1
)
echo Batch 118 OK
echo.

echo Execution batch 119/161...
psql "%DB_URL%" -f batch_119_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 119
    pause
    exit /b 1
)
echo Batch 119 OK
echo.

echo Execution batch 120/161...
psql "%DB_URL%" -f batch_120_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 120
    pause
    exit /b 1
)
echo Batch 120 OK
echo.

echo Execution batch 121/161...
psql "%DB_URL%" -f batch_121_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 121
    pause
    exit /b 1
)
echo Batch 121 OK
echo.

echo Execution batch 122/161...
psql "%DB_URL%" -f batch_122_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 122
    pause
    exit /b 1
)
echo Batch 122 OK
echo.

echo Execution batch 123/161...
psql "%DB_URL%" -f batch_123_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 123
    pause
    exit /b 1
)
echo Batch 123 OK
echo.

echo Execution batch 124/161...
psql "%DB_URL%" -f batch_124_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 124
    pause
    exit /b 1
)
echo Batch 124 OK
echo.

echo Execution batch 125/161...
psql "%DB_URL%" -f batch_125_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 125
    pause
    exit /b 1
)
echo Batch 125 OK
echo.

echo Execution batch 126/161...
psql "%DB_URL%" -f batch_126_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 126
    pause
    exit /b 1
)
echo Batch 126 OK
echo.

echo Execution batch 127/161...
psql "%DB_URL%" -f batch_127_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 127
    pause
    exit /b 1
)
echo Batch 127 OK
echo.

echo Execution batch 128/161...
psql "%DB_URL%" -f batch_128_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 128
    pause
    exit /b 1
)
echo Batch 128 OK
echo.

echo Execution batch 129/161...
psql "%DB_URL%" -f batch_129_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 129
    pause
    exit /b 1
)
echo Batch 129 OK
echo.

echo Execution batch 130/161...
psql "%DB_URL%" -f batch_130_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 130
    pause
    exit /b 1
)
echo Batch 130 OK
echo.

echo Execution batch 131/161...
psql "%DB_URL%" -f batch_131_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 131
    pause
    exit /b 1
)
echo Batch 131 OK
echo.

echo Execution batch 132/161...
psql "%DB_URL%" -f batch_132_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 132
    pause
    exit /b 1
)
echo Batch 132 OK
echo.

echo Execution batch 133/161...
psql "%DB_URL%" -f batch_133_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 133
    pause
    exit /b 1
)
echo Batch 133 OK
echo.

echo Execution batch 134/161...
psql "%DB_URL%" -f batch_134_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 134
    pause
    exit /b 1
)
echo Batch 134 OK
echo.

echo Execution batch 135/161...
psql "%DB_URL%" -f batch_135_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 135
    pause
    exit /b 1
)
echo Batch 135 OK
echo.

echo Execution batch 136/161...
psql "%DB_URL%" -f batch_136_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 136
    pause
    exit /b 1
)
echo Batch 136 OK
echo.

echo Execution batch 137/161...
psql "%DB_URL%" -f batch_137_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 137
    pause
    exit /b 1
)
echo Batch 137 OK
echo.

echo Execution batch 138/161...
psql "%DB_URL%" -f batch_138_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 138
    pause
    exit /b 1
)
echo Batch 138 OK
echo.

echo Execution batch 139/161...
psql "%DB_URL%" -f batch_139_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 139
    pause
    exit /b 1
)
echo Batch 139 OK
echo.

echo Execution batch 140/161...
psql "%DB_URL%" -f batch_140_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 140
    pause
    exit /b 1
)
echo Batch 140 OK
echo.

echo Execution batch 141/161...
psql "%DB_URL%" -f batch_141_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 141
    pause
    exit /b 1
)
echo Batch 141 OK
echo.

echo Execution batch 142/161...
psql "%DB_URL%" -f batch_142_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 142
    pause
    exit /b 1
)
echo Batch 142 OK
echo.

echo Execution batch 143/161...
psql "%DB_URL%" -f batch_143_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 143
    pause
    exit /b 1
)
echo Batch 143 OK
echo.

echo Execution batch 144/161...
psql "%DB_URL%" -f batch_144_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 144
    pause
    exit /b 1
)
echo Batch 144 OK
echo.

echo Execution batch 145/161...
psql "%DB_URL%" -f batch_145_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 145
    pause
    exit /b 1
)
echo Batch 145 OK
echo.

echo Execution batch 146/161...
psql "%DB_URL%" -f batch_146_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 146
    pause
    exit /b 1
)
echo Batch 146 OK
echo.

echo Execution batch 147/161...
psql "%DB_URL%" -f batch_147_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 147
    pause
    exit /b 1
)
echo Batch 147 OK
echo.

echo Execution batch 148/161...
psql "%DB_URL%" -f batch_148_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 148
    pause
    exit /b 1
)
echo Batch 148 OK
echo.

echo Execution batch 149/161...
psql "%DB_URL%" -f batch_149_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 149
    pause
    exit /b 1
)
echo Batch 149 OK
echo.

echo Execution batch 150/161...
psql "%DB_URL%" -f batch_150_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 150
    pause
    exit /b 1
)
echo Batch 150 OK
echo.

echo Execution batch 151/161...
psql "%DB_URL%" -f batch_151_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 151
    pause
    exit /b 1
)
echo Batch 151 OK
echo.

echo Execution batch 152/161...
psql "%DB_URL%" -f batch_152_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 152
    pause
    exit /b 1
)
echo Batch 152 OK
echo.

echo Execution batch 153/161...
psql "%DB_URL%" -f batch_153_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 153
    pause
    exit /b 1
)
echo Batch 153 OK
echo.

echo Execution batch 154/161...
psql "%DB_URL%" -f batch_154_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 154
    pause
    exit /b 1
)
echo Batch 154 OK
echo.

echo Execution batch 155/161...
psql "%DB_URL%" -f batch_155_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 155
    pause
    exit /b 1
)
echo Batch 155 OK
echo.

echo Execution batch 156/161...
psql "%DB_URL%" -f batch_156_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 156
    pause
    exit /b 1
)
echo Batch 156 OK
echo.

echo Execution batch 157/161...
psql "%DB_URL%" -f batch_157_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 157
    pause
    exit /b 1
)
echo Batch 157 OK
echo.

echo Execution batch 158/161...
psql "%DB_URL%" -f batch_158_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 158
    pause
    exit /b 1
)
echo Batch 158 OK
echo.

echo Execution batch 159/161...
psql "%DB_URL%" -f batch_159_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 159
    pause
    exit /b 1
)
echo Batch 159 OK
echo.

echo Execution batch 160/161...
psql "%DB_URL%" -f batch_160_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 160
    pause
    exit /b 1
)
echo Batch 160 OK
echo.

echo Execution batch 161/161...
psql "%DB_URL%" -f batch_161_of_161.sql
if errorlevel 1 (
    echo ERREUR dans batch 161
    pause
    exit /b 1
)
echo Batch 161 OK
echo.

echo ========================================
echo INJECTION TERMINEE!
echo ========================================
pause
