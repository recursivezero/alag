type GoogleCredentialCallback = (credential: string) => Promise<void> | void

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with'

type GoogleButtonOptions = {
  clientId: string
  buttonId: string
  onCredential: GoogleCredentialCallback
  onUnavailable?: () => void
  text?: GoogleButtonText
  fallbackLabel?: string
}

let googleScriptPromise: Promise<void> | null = null

export const loadGoogleIdentityScript = () => {
  if ((window as any).google?.accounts?.id) {
    return Promise.resolve()
  }

  if (googleScriptPromise) {
    return googleScriptPromise
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google script failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google script failed to load'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export const mountGoogleIdentityButton = async ({
  clientId,
  buttonId,
  onCredential,
  onUnavailable,
}: GoogleButtonOptions) => {
  const button = document.getElementById(buttonId)

  if (!button) {
    return false
  }

  if (!clientId) {
    button.innerHTML = `
      <span class="google-button-content">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.5-5.5 3.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C15.3 2.4 13.8 1.8 12 1.8 6.9 1.8 2.7 6 2.7 11.1S6.9 20.4 12 20.4c6 0 9.9-4.2 9.9-10.1 0-.7-.1-1.3-.2-1.8H12z"/>
        </svg>
        <span>Continue with Google</span>
      </span>
    `
    button.classList.add('google-button-shell')
    button.setAttribute('role', 'button')
    button.setAttribute('aria-disabled', 'true')
    button.setAttribute('tabindex', '0')
    onUnavailable?.()
    return false
  }

  await loadGoogleIdentityScript()

  const google = (window as any).google

  if (!google?.accounts?.id || !button) {
    onUnavailable?.()
    return false
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: async (response: { credential: string }) => {
      if (!response?.credential) {
        return
      }

      await onCredential(response.credential)
    },
  })

  google.accounts.id.renderButton(button, {
    theme: 'outline',
    size: 'large',
    width: 320,
    shape: 'pill',
    text: 'continue_with',
  })

  return true
}