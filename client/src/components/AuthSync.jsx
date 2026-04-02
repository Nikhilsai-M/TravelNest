import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { syncAuthenticatedUser } from "../lib/api.js";

export default function AuthSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let isCancelled = false;

    async function syncUser() {
      try {
        if (isCancelled) {
          return;
        }

        await syncAuthenticatedUser(getToken);
      } catch (error) {
        console.error("Failed to sync authenticated user to MongoDB.", error);
      }
    }

    syncUser();

    return () => {
      isCancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}
