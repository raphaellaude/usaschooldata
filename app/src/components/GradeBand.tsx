import type {SchoolDirectoryInfo} from '../hooks/useSchoolDirectory';

interface GradeBandProps {
  directoryInfo: SchoolDirectoryInfo;
  showUngraded?: boolean;
}

const GRADES = [
  {key: 'grade_pk', label: 'PK'},
  {key: 'grade_kg', label: 'K'},
  {key: 'grade_01', label: '1'},
  {key: 'grade_02', label: '2'},
  {key: 'grade_03', label: '3'},
  {key: 'grade_04', label: '4'},
  {key: 'grade_05', label: '5'},
  {key: 'grade_06', label: '6'},
  {key: 'grade_07', label: '7'},
  {key: 'grade_08', label: '8'},
  {key: 'grade_09', label: '9'},
  {key: 'grade_10', label: '10'},
  {key: 'grade_11', label: '11'},
  {key: 'grade_12', label: '12'},
  {key: 'grade_13', label: '13'},
];

export default function GradeBand({directoryInfo, showUngraded = false}: GradeBandProps) {
  const hasUngraded = directoryInfo.grade_ug === 'Yes' || directoryInfo.grade_ug === '1';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 mr-2">Grades:</span>
      <div className="flex gap-0.5">
        {GRADES.map(grade => {
          const hasGrade =
            directoryInfo[grade.key] === 'Yes' ||
            directoryInfo[grade.key] === '1' ||
            directoryInfo[grade.key] === 1;
          return (
            <div
              key={grade.key}
              className={`w-6 h-6 flex items-center justify-center text-xs ${
                hasGrade ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-400'
              }`}
              title={hasGrade ? `Grade ${grade.label}` : `No Grade ${grade.label}`}
            >
              {grade.label}
            </div>
          );
        })}
      </div>
      {showUngraded && hasUngraded && (
        <div className="ml-2 px-2 py-1 bg-gray-400 text-white text-xs">UG</div>
      )}
    </div>
  );
}
