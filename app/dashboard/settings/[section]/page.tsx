import SettingsContent from "../_components/SettingsContent"

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  return <SettingsContent section={section} />
}
