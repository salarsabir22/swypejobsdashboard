import { redirect } from "next/navigation"

export default function UniversitySignupPage() {
  redirect("/signup?role=university")
}
