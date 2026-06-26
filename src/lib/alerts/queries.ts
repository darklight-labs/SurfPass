import "server-only"

import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/alerts/constants"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { AlertPreferenceViewModel, GroupRole } from "@/types/domain"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"]
type AlertPreferenceRow =
  Database["public"]["Tables"]["alert_preferences"]["Row"]

export type AlertPreferencesResult = {
  preferences: AlertPreferenceViewModel[]
  error?: string
}

function groupName(group: GroupRow | undefined, groupId: string) {
  return group?.name ?? `Group ${groupId.slice(0, 8)}`
}

function mapPreference({
  membership,
  group,
  preference,
}: {
  membership: GroupMemberRow
  group?: GroupRow
  preference?: AlertPreferenceRow
}): AlertPreferenceViewModel {
  return {
    groupId: membership.group_id,
    groupName: groupName(group, membership.group_id),
    currentUserRole: membership.role as GroupRole,
    emailEnabled: preference?.email_enabled ?? true,
    leadMinutes: preference?.lead_minutes ?? DEFAULT_ALERT_LEAD_MINUTES,
    updatedAt: preference?.updated_at ?? null,
    isPersisted: Boolean(preference),
  }
}

export async function getAlertPreferencesForCurrentUser(): Promise<AlertPreferencesResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id,user_id,role,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (membershipError) {
      return {
        preferences: [],
        error: membershipError.message,
      }
    }

    const membershipRows = memberships ?? []
    const groupIds = membershipRows.map((membership) => membership.group_id)

    if (groupIds.length === 0) {
      return { preferences: [] }
    }

    const [
      { data: groups, error: groupsError },
      { data: preferences, error: preferencesError },
    ] = await Promise.all([
      supabase
        .from("groups")
        .select("id,owner_id,name,description,created_at,updated_at")
        .in("id", groupIds),
      supabase
        .from("alert_preferences")
        .select(
          "id,user_id,group_id,email_enabled,lead_minutes,created_at,updated_at"
        )
        .eq("user_id", user.id)
        .in("group_id", groupIds),
    ])

    if (groupsError || preferencesError) {
      return {
        preferences: [],
        error:
          groupsError?.message ??
          preferencesError?.message ??
          "Alert preferences could not be loaded.",
      }
    }

    const groupMap = new Map((groups ?? []).map((group) => [group.id, group]))
    const preferenceMap = new Map(
      (preferences ?? []).map((preference) => [
        preference.group_id,
        preference,
      ])
    )

    return {
      preferences: membershipRows
        .map((membership) =>
          mapPreference({
            membership,
            group: groupMap.get(membership.group_id),
            preference: preferenceMap.get(membership.group_id),
          })
        )
        .sort((a, b) => a.groupName.localeCompare(b.groupName)),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        preferences: [],
        error:
          "Supabase environment variables are required to load alert preferences.",
      }
    }

    throw error
  }
}
