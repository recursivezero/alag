import { initializeThemeStore, toggleTheme } from "@/stores/themeStore"

initializeThemeStore()

const themeToggleButtons = document.querySelectorAll<HTMLButtonElement>(
  "[data-theme-toggle]",
)

themeToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleTheme()
  })
})
