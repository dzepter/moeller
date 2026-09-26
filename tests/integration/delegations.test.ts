import { describe, it, expect } from "vitest";
import { createDelegation, cancelDelegation } from "@/server/delegations";
import { createRegions, createUser, asCurrentUser, TEAMLEITER_PERMS, INNENDIENST_PERMS } from "../factory";
import { ForbiddenError } from "@/lib/rbac";

describe("Vertretungs-Schutzregeln (§22)", () => {
  async function setup() {
    const regions = await createRegions();
    const tlNrw = await createUser({ name: "TL NRW", regionId: regions.nrw.id });
    const tlBayern = await createUser({ name: "TL Bayern", regionId: regions.bayern.id });
    return { regions, tlNrw, tlBayern };
  }

  const window = () => ({
    startsAt: new Date(Date.now() + 3600_000),
    endsAt: new Date(Date.now() + 7 * 86_400_000),
  });

  it("Teamleiter darf die eigene Vertretung anlegen (Default-Policy)", async () => {
    const { tlNrw, tlBayern } = await setup();
    const user = asCurrentUser(tlNrw, TEAMLEITER_PERMS, "NRW");
    const delegation = await createDelegation(user, { fromUserId: tlNrw.id, toUserId: tlBayern.id, ...window() });
    expect(delegation.id).toBeTruthy();
  });

  it("Teamleiter darf KEINE fremde Vertretung anlegen", async () => {
    const { tlNrw, tlBayern } = await setup();
    const user = asCurrentUser(tlNrw, TEAMLEITER_PERMS, "NRW");
    await expect(
      createDelegation(user, { fromUserId: tlBayern.id, toUserId: tlNrw.id, ...window() }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("keine Selbstvertretung", async () => {
    const { tlNrw } = await setup();
    const user = asCurrentUser(tlNrw, TEAMLEITER_PERMS, "NRW");
    await expect(createDelegation(user, { fromUserId: tlNrw.id, toUserId: tlNrw.id, ...window() })).rejects.toThrow(
      /Selbstvertretung/,
    );
  });

  it("keine zirkuläre Vertretung im selben Zeitraum", async () => {
    const { tlNrw, tlBayern } = await setup();
    const admin = asCurrentUser(await createUser({ name: "Admin" }), INNENDIENST_PERMS);
    const w = window();
    await createDelegation(admin, { fromUserId: tlNrw.id, toUserId: tlBayern.id, ...w });
    await expect(createDelegation(admin, { fromUserId: tlBayern.id, toUserId: tlNrw.id, ...w })).rejects.toThrow(
      /[Zz]irkul/,
    );
  });

  it("keine überlappende Doppel-Vertretung", async () => {
    const { tlNrw, tlBayern } = await setup();
    const admin = asCurrentUser(await createUser({ name: "Admin" }), INNENDIENST_PERMS);
    const w = window();
    await createDelegation(admin, { fromUserId: tlNrw.id, toUserId: tlBayern.id, ...w });
    await expect(createDelegation(admin, { fromUserId: tlNrw.id, toUserId: tlBayern.id, ...w })).rejects.toThrow(
      /überlappende/,
    );
  });

  it("Ende muss nach Beginn liegen", async () => {
    const { tlNrw, tlBayern } = await setup();
    const admin = asCurrentUser(await createUser({ name: "Admin" }), INNENDIENST_PERMS);
    await expect(
      createDelegation(admin, {
        fromUserId: tlNrw.id,
        toUserId: tlBayern.id,
        startsAt: new Date(Date.now() + 7200_000),
        endsAt: new Date(Date.now() + 3600_000),
      }),
    ).rejects.toThrow(/Ende/);
  });

  it("Innendienst darf Vertretungen vorzeitig beenden, fremde Teamleiter nicht", async () => {
    const { tlNrw, tlBayern, regions } = await setup();
    const admin = asCurrentUser(await createUser({ name: "Admin" }), INNENDIENST_PERMS);
    const delegation = await createDelegation(admin, { fromUserId: tlNrw.id, toUserId: tlBayern.id, ...window() });

    const dritter = await createUser({ name: "TL Hessen", regionId: regions.hessen.id });
    await expect(cancelDelegation(asCurrentUser(dritter, TEAMLEITER_PERMS, "HESSEN"), delegation.id)).rejects.toThrow(
      ForbiddenError,
    );
    await cancelDelegation(admin, delegation.id); // Innendienst darf
  });
});
