import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [{
  "files": ['src/**/*.ts'],
  "languageOptions": {
    "parser": tsParser
  },
  "plugins": { "typescript": tsPlugin },
  "rules": {
    "typescript/naming-convention": "warn",
    "typescript/semi": "warn",
    "curly": "warn",
    "eqeqeq": "warn",
    "no-throw-literal": "warn",
    "semi": "off"
  },
}]
