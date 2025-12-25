import { describe, it, expect } from 'vitest';
import { td } from './utils.js';
import { ValidationResultImpl } from '../src/ValidationResult.js';

describe('ValidationResultImpl', () => {
    describe('constructor', () => {
        it(td('Should create instance with default valid state as true.'), () => {
            const result = new ValidationResultImpl();
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(Array.isArray(result.errors)).toBe(true);
        });

        it(td('Should create instance with explicit valid state as true.'), () => {
            const result = new ValidationResultImpl(true);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it(td('Should create instance with explicit valid state as false.'), () => {
            const result = new ValidationResultImpl(false);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('valid property', () => {
        it(td('Should return true for new instance with default constructor.'), () => {
            const result = new ValidationResultImpl();
            expect(result.valid).toBe(true);
        });

        it(td('Should return false after adding first error.'), () => {
            const result = new ValidationResultImpl();
            result.addError('Test error');
            expect(result.valid).toBe(false);
        });

        it(td('Should remain false after adding multiple errors.'), () => {
            const result = new ValidationResultImpl();
            result.addError('First error');
            result.addError('Second error');
            expect(result.valid).toBe(false);
        });

        it(td('Should return initial false state when constructed with false.'), () => {
            const result = new ValidationResultImpl(false);
            expect(result.valid).toBe(false);
        });
    });

    describe('errors property', () => {
        it(td('Should return empty array for new instance.'), () => {
            const result = new ValidationResultImpl();
            expect(result.errors).toEqual([]);
            expect(result.errors).toHaveLength(0);
        });

        it(td('Should return array with single error after adding one error.'), () => {
            const result = new ValidationResultImpl();
            result.addError('Test error message');
            
            expect(result.errors).toEqual(['Test error message']);
            expect(result.errors).toHaveLength(1);
        });

        it(td('Should return array with multiple errors in order they were added.'), () => {
            const result = new ValidationResultImpl();
            result.addError('First error');
            result.addError('Second error');
            result.addError('Third error');
            
            expect(result.errors).toEqual([
                'First error',
                'Second error', 
                'Third error'
            ]);
            expect(result.errors).toHaveLength(3);
        });

        it(td('Should return defensive copy of errors array.'), () => {
            const result = new ValidationResultImpl();
            result.addError('Original error');
            
            const errors1 = result.errors;
            const errors2 = result.errors;
            
            expect(errors1).not.toBe(errors2); // Different references (defensive copies)
            expect(errors1).toEqual(errors2);  // Same content
            expect(errors1).toEqual(['Original error']);
        });
    });

    describe('addError method', () => {
        it(td('Should add single error message to errors array.'), () => {
            const result = new ValidationResultImpl();
            result.addError('Error message');
            
            expect(result.errors).toContain('Error message');
            expect(result.errors).toHaveLength(1);
        });

        it(td('Should set valid to false when adding first error.'), () => {
            const result = new ValidationResultImpl();
            expect(result.valid).toBe(true);
            
            result.addError('First error');
            expect(result.valid).toBe(false);
        });

        it(td('Should keep valid as false when adding subsequent errors.'), () => {
            const result = new ValidationResultImpl();
            
            result.addError('First error');
            expect(result.valid).toBe(false);
            
            result.addError('Second error');
            expect(result.valid).toBe(false);
        });

        it(td('Should preserve order of multiple error messages.'), () => {
            const result = new ValidationResultImpl();
            
            result.addError('Error A');
            result.addError('Error B');
            result.addError('Error C');
            
            expect(result.errors[0]).toBe('Error A');
            expect(result.errors[1]).toBe('Error B');
            expect(result.errors[2]).toBe('Error C');
        });

        [
            { input: '', description: 'empty string' },
            { input: 'Simple error', description: 'simple text' },
            { input: 'Error with "quotes" and special chars: @#$%', description: 'special characters' },
            { input: 'Multi-line\nerror\nmessage', description: 'multi-line text' },
            { input: '   Error with whitespace   ', description: 'whitespace padding' }
        ].forEach(({ input, description }) => {
            it(td(`Should accept error message with ${description}.`), () => {
                const result = new ValidationResultImpl();
                result.addError(input);
                
                expect(result.errors).toContain(input);
                expect(result.errors[0]).toBe(input);
            });
        });

        it(td('Should handle adding same error message multiple times.'), () => {
            const result = new ValidationResultImpl();
            const errorMsg = 'Duplicate error message';
            
            result.addError(errorMsg);
            result.addError(errorMsg);
            result.addError(errorMsg);
            
            expect(result.errors).toEqual([errorMsg, errorMsg, errorMsg]);
            expect(result.errors).toHaveLength(3);
        });
    });

    describe('state transitions', () => {
        it(td('Should transition from valid to invalid when adding first error.'), () => {
            const result = new ValidationResultImpl(true);
            
            // Initial state
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            // After adding error
            result.addError('State change error');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
        });

        it(td('Should remain invalid when starting with false and adding errors.'), () => {
            const result = new ValidationResultImpl(false);
            
            // Initial state
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(0);
            
            // After adding error
            result.addError('Additional error');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
        });

        it(td('Should maintain state consistency through multiple operations.'), () => {
            const result = new ValidationResultImpl();
            
            // Start valid
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            
            // Add first error
            result.addError('Error 1');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            
            // Add more errors
            result.addError('Error 2');
            result.addError('Error 3');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(3);
            expect(result.errors).toEqual(['Error 1', 'Error 2', 'Error 3']);
        });
    });

    describe('edge cases', () => {
        it(td('Should handle rapid successive error additions.'), () => {
            const result = new ValidationResultImpl();
            const errorCount = 100;
            
            for (let i = 0; i < errorCount; i++) {
                result.addError(`Error ${i}`);
            }
            
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(errorCount);
            expect(result.errors[0]).toBe('Error 0');
            expect(result.errors[errorCount - 1]).toBe(`Error ${errorCount - 1}`);
        });

        it(td('Should not allow external modification of errors array.'), () => {
            const result = new ValidationResultImpl();
            result.addError('Protected error');
            
            const errorsRef = result.errors;
            errorsRef.push('Attempted external addition');
            
            // The original should be unchanged if properly encapsulated
            expect(result.errors).not.toContain('Attempted external addition');
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toBe('Protected error');
        });
    });
});