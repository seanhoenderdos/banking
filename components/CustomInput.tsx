import React from 'react'
import { FormControl, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'

import { Control, FieldPath } from 'react-hook-form'
import { z } from 'zod'
import { authFormSchema } from '@/lib/utils'

const formSchema = authFormSchema('sign-up')

interface CustomInput {
    control: Control<z.infer<typeof formSchema>>,
    name: FieldPath<z.infer<typeof formSchema>>,
    label: string,
    placeholder: string
}

const CustomInput = ({ control, name, label, placeholder }: CustomInput) => {
  const inputId = `${name}-input`;

  // Determine autocomplete value based on input type
  const autoComplete = name === 'password' ? 'current-password' : name === 'email' ? 'email' : 'off';

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className='form-item'>
          <FormLabel className='form-label' htmlFor={inputId}>
            {label}
          </FormLabel>
          <div className='flex w-full flex-col'>
            <FormControl>
              <Input
                id={inputId}
                placeholder={placeholder}
                className='input-class'
                type={name === 'password' ? 'password' : 'text'}
                autoComplete={autoComplete} // Add autoComplete attribute here
                {...field}
              />
            </FormControl>
            <FormMessage className='form-message mt-2'/>
          </div>
        </div>
      )}
    />
  )
}

export default CustomInput
