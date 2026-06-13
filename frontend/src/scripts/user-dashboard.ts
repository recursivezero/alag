import { clearUserSessionToken } from "@/services/session"
import { initializeThemeStore, toggleTheme } from "@/stores/themeStore"
import { setStoredUser, getStoredUser } from "../stores/userStore"
import type { UserProfile } from "../types/user"

const themeToggleButton = document.querySelector("[data-theme-toggle]")
const userLogoutToggle = document.getElementById(
  "userLogoutToggle",
) as HTMLInputElement | null
const userLogoutPopover = document.getElementById("userLogoutPopover")
const userLogoutDialog = document.querySelector(
  "[data-user-logout-dialog]",
) as HTMLElement | null
const userLogoutBackdrop = document.querySelector(
  "[data-user-logout-backdrop]",
) as HTMLElement | null
const userLogoutCancelButton = document.getElementById("userLogoutCancelBtn")
const userLogoutConfirmButton = document.getElementById(
  "userLogoutConfirmBtn",
) as HTMLButtonElement | null

const userLogoutTriggers = document.querySelectorAll("[data-user-logout-button]")
const userLogoutFocusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let userLogoutLastFocusedElement: HTMLElement | null = null
let userLogoutKeyboardListenerAttached = false

const getUserLogoutFocusableElements = () => {
  if (!userLogoutPopover) return []

  return Array.from(
    userLogoutPopover.querySelectorAll<HTMLElement>(userLogoutFocusableSelector),
  ).filter((element) => element.offsetParent !== null)
}

const applyUserProfileUpdate = (user: UserProfile | null | undefined) => {
  if (!user) return

  const fullName = user.fullName || user.name || "User"
  const email = user.email || ""
  const phoneNumber = user.phoneNumber || "Phone not set"
  const picture = user.picture || "/icon.png"

  const avatarSelectors = [
    "[data-user-profile-trigger-avatar] img",
    "[data-user-profile-avatar] img",
    "[data-dashboard-profile-avatar] img",
  ]

  avatarSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element instanceof HTMLImageElement) {
        element.src = picture
        element.alt = `${fullName} avatar`
      }
    })
  })

  const textTargets: Array<[string, string]> = [
    ["[data-user-profile-name]", fullName],
    ["[data-user-profile-email]", email],
    ["[data-user-profile-phone]", phoneNumber],
    ["[data-dashboard-profile-full-name]", fullName],
    ["[data-dashboard-profile-name]", fullName],
    ["[data-dashboard-profile-email]", email],
    ["[data-dashboard-profile-phone]", phoneNumber],
    ["[data-dashboard-profile-bio]", user.bio || "Not set"],
    ["[data-dashboard-profile-username]", user.username || "Not set"],
  ]

  textTargets.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element instanceof HTMLElement) {
        element.textContent = String(value)
      }
    })
  })

  setStoredUser(user)
  document.dispatchEvent(
    new CustomEvent("alag-user-profile-updated", {
      detail: user,
    }),
  )
}

const syncTopbarThemeIcons = () => {
  const themeButton = document.querySelector("[data-topbar-theme-btn]")
  if (!themeButton) return

  const isDark = document.documentElement.classList.contains("dark")
  const sun = themeButton.querySelector("[data-theme-icon-sun]")
  const moon = themeButton.querySelector("[data-theme-icon-moon]")
  if (sun instanceof Element) sun.setAttribute("style", `display: ${isDark ? "block" : "none"}`)
  if (moon instanceof Element) moon.setAttribute("style", `display: ${isDark ? "none" : "block"}`)
}

const openUserLogoutModal = () => {
  if (userLogoutToggle) {
    userLogoutToggle.checked = true
  }

  if (userLogoutPopover) {
    userLogoutPopover.setAttribute("aria-hidden", "false")
    userLogoutPopover.inert = false
  }

  userLogoutLastFocusedElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

  if (!userLogoutKeyboardListenerAttached) {
    document.addEventListener("keydown", handleUserLogoutKeydown)
    userLogoutKeyboardListenerAttached = true
  }

  window.requestAnimationFrame(() => {
    userLogoutConfirmButton?.focus()
  })
}

const closeUserLogoutModal = () => {
  if (userLogoutToggle) {
    userLogoutToggle.checked = false
  }

  if (userLogoutPopover) {
    userLogoutPopover.setAttribute("aria-hidden", "true")
    userLogoutPopover.inert = true
  }

  if (userLogoutKeyboardListenerAttached) {
    document.removeEventListener("keydown", handleUserLogoutKeydown)
    userLogoutKeyboardListenerAttached = false
  }

  userLogoutLastFocusedElement?.focus()
  userLogoutLastFocusedElement = null
}

const handleUserLogoutKeydown = (event: KeyboardEvent) => {
  if (!userLogoutToggle?.checked || !userLogoutPopover) return

  if (event.key === "Escape") {
    event.preventDefault()
    closeUserLogoutModal()
    return
  }

  if (event.key === "Enter") {
    event.preventDefault()
    userLogoutConfirmButton?.click()
    return
  }

  if (event.key !== "Tab") return

  const focusableElements = getUserLogoutFocusableElements()
  if (focusableElements.length === 0) return

  const firstFocusableElement = focusableElements[0]
  const lastFocusableElement = focusableElements[focusableElements.length - 1]

  if (event.shiftKey && document.activeElement === firstFocusableElement) {
    event.preventDefault()
    lastFocusableElement.focus()
    return
  }

  if (!event.shiftKey && document.activeElement === lastFocusableElement) {
    event.preventDefault()
    firstFocusableElement.focus()
  }
}

initializeThemeStore()
syncTopbarThemeIcons()

const storedUser = getStoredUser()
if (storedUser) {
  applyUserProfileUpdate(storedUser)
}

themeToggleButton?.addEventListener("click", () => {
  toggleTheme()
})

document.addEventListener("alag-theme-change", () => {
  syncTopbarThemeIcons()
})

document.addEventListener("alag-user-profile-updated", (event) => {
  const updatedUser = (event as CustomEvent<UserProfile>).detail
  applyUserProfileUpdate(updatedUser)
})

window.addEventListener("storage", (event) => {
  if (event.key !== "alag-user-profile" || !event.newValue) return

  try {
    const updatedUser = JSON.parse(event.newValue)
    applyUserProfileUpdate(updatedUser)
  } catch {
    // Ignore malformed profile payloads.
  }
})

document.addEventListener("theme-toggle-request", () => {
  toggleTheme()
})

userLogoutTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault()
    openUserLogoutModal()
  })
})

userLogoutCancelButton?.addEventListener("click", () => {
  closeUserLogoutModal()
})

userLogoutPopover?.addEventListener("click", (event) => {
  if (
    event.target === userLogoutPopover ||
    (userLogoutDialog && event.target instanceof Node && !userLogoutDialog.contains(event.target))
  ) {
    closeUserLogoutModal()
  }
})

userLogoutBackdrop?.addEventListener("click", () => {
  closeUserLogoutModal()
})

userLogoutToggle?.addEventListener("change", () => {
  if (userLogoutToggle.checked) {
    openUserLogoutModal()
    return
  }

  closeUserLogoutModal()
})

userLogoutConfirmButton?.addEventListener("click", async () => {
  userLogoutConfirmButton.disabled = true

  try {
    await clearUserSessionToken()
  } finally {
    window.location.replace("/login")
  }
})