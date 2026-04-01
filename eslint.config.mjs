import globals from 'globals';
import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['**/artifacts/', '**/node_modules/', '**/out/', '**/dist/']
  },
  eslint.configs.recommended,
  prettier,
  jsdoc.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.es6,
        ...globals.node
      }
    },
    plugins: {
      jsdoc
    },
    rules: {
      'comma-dangle': 'off',
      'eqeqeq': 'error',
      'indent': 'off',
      'jsdoc/no-undefined-types': [
        'warn',
        {
          definedTypes: ['NodeJS']
        }
      ],
      'jsdoc/require-description': 'warn',
      'jsdoc/require-description-complete-sentence': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          contexts: [
            'TSInterfaceDeclaration',
            'TSMethodSignature',
            'TSPropertySignature'
          ],
          enableFixer: true,
          publicOnly: {
            ancestorsOnly: true,
            cjs: true,
            esm: true
          },
          require: {
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            MethodDefinition: true
          }
        }
      ],
      'max-len': 'off',
      'no-empty-function': 'off',
      'no-invalid-this': 'off',
      'no-unused-vars': 'off',
      'object-curly-spacing': ['error', 'always'],
      'prettier/prettier': [
        'error',
        {
          printWidth: 80,
          quoteProps: 'consistent',
          semi: true,
          singleQuote: true,
          trailingComma: 'none'
        }
      ],
      'semi': 'error',
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never'
        }
      ]
    }
  }
];
