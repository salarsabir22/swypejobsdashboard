import { announcementAudienceLabels } from "@/lib/campus/announcement-audience"
import { Badge } from "@/components/ui/badge"

export function AnnouncementAudienceBadges({ audience }: { audience: string | null | undefined }) {
  const labels = announcementAudienceLabels(audience)
  if (!labels.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <Badge key={label} variant="outline" className="font-medium">
          {label}
        </Badge>
      ))}
    </div>
  )
}
