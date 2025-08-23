import SettingsContent from "../_components/SettingsContent"

export default function SettingsSectionPage({ params }: { params: { section: string } }) {
  return <SettingsContent section={params.section} />
}
