import AuthForm from '@/components/AuthForm'
import React from 'react'

const SignUp = async () => {

  return (
    <section className='flex-xenter size-full max-sm:px-6'>
      <AuthForm type="sign-up"/>
    </section>
  )
}

export default SignUp