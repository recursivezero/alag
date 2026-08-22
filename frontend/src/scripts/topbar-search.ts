import { searchUsers } from "../services/userService"
import type { SearchUserResult } from "../types/user"

const wrap = document.getElementById("topbarSearchWrap")
const input = document.getElementById("topbarSearchInput") as HTMLInputElement | null
const resultsPanel = document.getElementById("topbarSearchResults")

if (input && resultsPanel && wrap) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;"
        case "<":
          return "&lt;"
        case ">":
          return "&gt;"
        case '"':
          return "&quot;"
        default:
          return "&#39;"
      }
    })

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"

  const renderResults = (users: SearchUserResult[], query: string) => {
    if (!users.length) {
      resultsPanel.innerHTML = `<div class="search-results-empty">No users found for "${escapeHtml(query)}"</div>`
      return
    }

    resultsPanel.innerHTML = users
      .map((user) => {
        const displayName = escapeHtml(user.fullName || user.name || "User")
        const usernameLine = user.username ? `@${escapeHtml(user.username)}` : ""
        const bioLine = user.bio ? escapeHtml(user.bio) : ""
        const metaLine = [usernameLine, bioLine].filter(Boolean).join(" · ")
        const avatar = user.picture
          ? `<img class="search-result-avatar" src="${escapeHtml(user.picture)}" alt="${displayName}" />`
          : `<div class="search-result-avatar">${initials(displayName)}</div>`

        return `
          <div class="search-result-item" data-user-id="${user.id}">
            ${avatar}
            <div class="min-w-0">
              <div class="search-result-name">${displayName}</div>
              ${metaLine ? `<div class="search-result-meta">${metaLine}</div>` : ""}
            </div>
          </div>
        `
      })
      .join("")
  }

  const closeResults = () => {
    resultsPanel.classList.add("hidden")
  }

  const openResults = () => {
    resultsPanel.classList.remove("hidden")
  }

  const runSearch = async (query: string) => {
    const currentRequestId = ++requestId
    const users = await searchUsers(query)

    
    if (currentRequestId !== requestId) return

    renderResults(users, query)
    openResults()
  }

  input.addEventListener("input", () => {
    const query = input.value.trim()

    if (debounceTimer) clearTimeout(debounceTimer)

    if (!query) {
      closeResults()
      return
    }

    debounceTimer = setTimeout(() => {
      runSearch(query)
    }, 300)
  })

  input.addEventListener("focus", () => {
    if (input.value.trim() && resultsPanel.innerHTML) {
      openResults()
    }
  })

  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target as Node)) {
      closeResults()
    }
  })

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResults()
      input.blur()
    }
  })
}