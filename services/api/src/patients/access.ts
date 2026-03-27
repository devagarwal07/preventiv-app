import { pool } from "../db/pool";

interface RequestingUser {
    id: string;
    role: "patient" | "doctor" | "dietician" | "physiotherapist" | "org_admin" | "platform_admin";
    orgId?: string | null;
}

export const canAccessPatient = async (
    requestingUser: RequestingUser,
    patientId: string
): Promise<boolean> => {
    if (requestingUser.role === "platform_admin" || requestingUser.role === "org_admin") {
        return true;
    }

    if (requestingUser.role === "patient") {
        return requestingUser.id === patientId;
    }

    const assignmentCheck = await pool.query<{ exists: boolean }>(
        `
      SELECT EXISTS (
        SELECT 1
        FROM consultations c
        WHERE c.patient_id = $1 AND c.professional_id = $2
      )
      OR EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.patient_id = $1 AND a.professional_id = $2
      )
      OR EXISTS (
        SELECT 1
        FROM care_plans cp
        WHERE cp.patient_id = $1 AND cp.created_by = $2
      )
      OR EXISTS (
        SELECT 1
        FROM org_memberships op
        JOIN org_memberships pp
          ON op.org_id = pp.org_id
        WHERE op.user_id = $2
          AND pp.user_id = $1
          AND op.role IN ('doctor', 'dietician', 'physiotherapist', 'org_admin')
          AND pp.role = 'patient'
      ) AS exists
    `,
        [patientId, requestingUser.id]
    );

    return assignmentCheck.rows[0]?.exists ?? false;
};
