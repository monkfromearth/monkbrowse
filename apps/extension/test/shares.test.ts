import { beforeEach, describe, expect, test } from "bun:test";

import {
  __resetCache,
  isShared,
  setShared,
  sharedSet,
  sharedSlots,
} from "../lib/shares";
import { installFakeChrome } from "./helpers/fake-chrome";

beforeEach(() => {
  installFakeChrome(async () => ({})); // fresh empty storage
  __resetCache();
});

describe("shares", () => {
  test("share / unshare tracks the set", async () => {
    expect(await isShared(101)).toBe(false);
    await setShared(101, true);
    expect(await isShared(101)).toBe(true);
    expect([...(await sharedSet())]).toEqual([101]);
    await setShared(101, false);
    expect(await isShared(101)).toBe(false);
  });

  test("assigns numbers to shared tabs, in order", async () => {
    await setShared(101, true);
    await setShared(102, true);
    const slots = await sharedSlots([101, 102]);
    expect(slots.get(101)).toBe(1);
    expect(slots.get(102)).toBe(2);
  });

  test("drops shares + numbers for closed tabs", async () => {
    await setShared(101, true);
    await setShared(102, true);
    await sharedSlots([101, 102]);
    const after = await sharedSlots([102]); // 101 closed
    expect(after.has(101)).toBe(false);
    expect(await isShared(101)).toBe(false);
    expect(after.get(102)).toBe(2); // keeps its number
  });

  test("new shares take the lowest free number", async () => {
    await setShared(101, true);
    await setShared(103, true);
    await sharedSlots([101, 103]); // 101->1, 103->2
    await setShared(101, false); // frees number 1
    await setShared(105, true);
    const slots = await sharedSlots([103, 105]);
    expect(slots.get(103)).toBe(2); // unchanged
    expect(slots.get(105)).toBe(1); // reused the freed number
  });

  test("persists to storage across a cache reset", async () => {
    await setShared(101, true);
    __resetCache(); // simulate service-worker restart (storage survives)
    expect(await isShared(101)).toBe(true);
  });
});
