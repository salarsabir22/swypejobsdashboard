"use client"

import type { MouseEventHandler, PointerEventHandler } from "react"
import { useSignedStorageUrl } from "@/components/storage/use-signed-storage-url"

export function SignedFileLink({
  bucket,
  href,
  children,
  className,
  onClick,
  onPointerDown,
}: {
  bucket: string
  href: string
  children: React.ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  onPointerDown?: PointerEventHandler<HTMLAnchorElement>
}) {
  const url = useSignedStorageUrl(bucket, href)
  if (!url) return null
  return (
    <a
      href={url}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {children}
    </a>
  )
}

export function CredentialLink({
  href,
  label,
  className,
  onClick,
  onPointerDown,
}: {
  href: string
  label: string
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  onPointerDown?: PointerEventHandler<HTMLAnchorElement>
}) {
  if (label === "Resume") {
    return (
      <SignedFileLink
        bucket="resumes"
        href={href}
        className={className}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        {label}
      </SignedFileLink>
    )
  }

  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {label}
    </a>
  )
}
