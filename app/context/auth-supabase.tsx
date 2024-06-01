import { useRootNavigation, useRouter, useSegments } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase-service";
import { Session, User } from "@supabase/supabase-js";
import { Linking } from "react-native";
import * as AuthSession from 'expo-auth-session';
import { jwtDecode } from "jwt-decode";
import "core-js/stable/atob";


// Define the AuthContextValue interface
interface SignInResponse {
  data: User | undefined | null;
  error: Error | undefined;
}

interface SignOutResponse {
  error: any | undefined;
  data: {} | undefined;
}

interface azureSignInResponse {
  error: any | undefined;
  data: {url: string} | undefined;

}

interface AuthContextValue {
  signIn: (e: string, p: string) => Promise<SignInResponse>;
  signUp: (e: string, p: string, n: string) => Promise<SignInResponse>;
  signOut: () => Promise<SignOutResponse>;
  azure: () => Promise<azureSignInResponse>;
  getAccessToken: (refreshToken: string) => Promise<SignInResponse>;
  user: User | null | undefined;
  authInitialized: boolean;
}

// Define the Provider component
interface ProviderProps {
  children: React.ReactNode;
}

// Create the AuthContext
const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

export function Provider(props: ProviderProps) {
  const [user, setAuth] = React.useState<User | null | undefined>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [authInitialized, setAuthInitialized] = React.useState<boolean>(false);

  // This hook will protect the route access based on user authentication.
  const useProtectedRoute = (user: User | null | undefined) => {
    const segments = useSegments();
    const router = useRouter();

    // checking that navigation is all good;
    const [isNavigationReady, setNavigationReady] = useState(false);
    const rootNavigation = useRootNavigation();

    useEffect(() => {
      const unsubscribe = rootNavigation?.addListener("state", (event) => {
        setNavigationReady(true);
      });
      return function cleanup() {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [rootNavigation]);

    React.useEffect(() => {
      if (!isNavigationReady) {
        return;
      }

      const inAuthGroup = segments[0] === "(auth)";

      if (!authInitialized) return;

      if (
        // If the user is not signed in and the initial segment is not anything in the auth group.
        !user &&
        !inAuthGroup
      ) {
        // Redirect to the sign-in page.
        router.push("/sign-in");
      } else if (user && inAuthGroup) {
        // Redirect away from the sign-in page.
        router.push("/");
      }
    }, [user, segments, authInitialized, isNavigationReady]);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      setSession(data.session);
      setAuth(data.session?.user);
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log(`Supabase auth event: ${event}`, session);
          setSession(session);
          setAuth(session?.user);

          if (!authInitialized) {
            setAuthInitialized(true);
          }
        }
      );

      return () => {
        authListener!.subscription.unsubscribe();
      };
    })();
  }, []);

  /**
   *
   * @returns
   */
  const logout = async (): Promise<SignOutResponse> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: undefined, data: true };
    } catch (error) {
      return { error, data: undefined };
    } finally {
      setAuth(null);
    }
  };
  /**
   *
   * @param email
   * @param password
   * @returns
   */
  const login = async (
    email: string,
    password: string
  ): Promise<SignInResponse> => {
    try {
      console.log(email, password);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      console.log("Data", data);
      
      setAuth(data.user);
      console.log("User", data.user);
      console.log("Session", data.session);
      
      
      setSession(data.session);
      return { data: user, error: undefined };
    } catch (error) {
      setAuth(null);
      setSession(null);
      return { error: error as Error, data: undefined };
    }
  };


  const getAccessToken = async (refreshToken: string) => {
    try {
    const { data, error } = await supabase.auth.refreshSession({refresh_token: refreshToken});
    if (error) throw error;
      console.log("Data", data);
      
      setAuth(data.user);
      console.log("User", data.user);
      console.log("Session", data.session);
      
      
      setSession(data.session);
      return { data: user, error: undefined };
    } catch (error) {
      setAuth(null);
      setSession(null);
      return { error: error as Error, data: undefined };
    }
  }
  const azureLogin = async () => {
    console.log('Azure Login');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email",
        },
        
      });
      
      if (error) throw error;
  
      return { data: data, error: error };
    } catch (error) {
      setAuth(null);
      setSession(null);
      console.log(error);
      console.log('Error');
      
      return { error: error as Error, data: undefined };
    }
  };

  const handleURLChange = async (event: any) => {
    console.log('Handle URL Change');
    
// Get the URL from the event object
const url = event.url;
console.log('event url', url);

// Check if the URL starts with the redirect URI
const redirectURI = AuthSession.makeRedirectUri();
  console.log("redirect url", redirectURI);
  
if (url.startsWith(redirectURI || url.startsWith("exp://127.0.0.1:8081"))) {
  // Remove the listener to prevent multiple calls
   //Linking.removeEventListener("url");
    Linking.removeAllListeners("url")
    
  // Parse the URL and get the access token
  const queryParams = new URLSearchParams(url.split("#")[1]);
  
  const accessToken = queryParams.get("access_token");
  const refreshToken = queryParams.get("refresh_token");
  console.log(accessToken);
  
  if (accessToken) {
    const decodedToken = jwtDecode(accessToken);
    // var email = decodedToken.email;


    console.log(decodedToken);
  } else {
    console.log('Access token not found');
  }
 if (refreshToken) {
   const { data, error } = await supabase.auth.refreshSession({refresh_token: refreshToken})
   const { session, user } = data
  console.log(session, user);
  
 }




  // Update state with access token
  // setAccessToken(accessToken);
    
  // Set the access token as a header for Supabase requests
 
  // setSession(accessToken)
}}


  /**
   *
   * @param email
   * @param password
   * @param username
   * @returns
   */
  const createAcount = async (
    email: string,
    password: string,
    username: string
  ): Promise<SignInResponse> => {
    try {
      console.log(email, password, username);

      // create the user
      const signUpResp = await supabase.auth.signUp({ email, password });
      if (signUpResp.error) throw signUpResp.error;

      const updateResp = await supabase.auth.updateUser({
        data: { name: username },
      });
      if (updateResp.error) throw updateResp.error;
      updateResp.data.user;

      // set user
      setAuth(updateResp.data.user);

      // set session
      setSession(signUpResp.data.session);
      return { data: updateResp.data.user, error: undefined };
    } catch (error) {
      setAuth(null);
      setSession(null);
      return { error: error as Error, data: undefined };
    }
  };

  useProtectedRoute(user);

  return (
    <AuthContext.Provider
      value={{
        signIn: login,
        signOut: logout,
        signUp: createAcount,
        azure: azureLogin,
        getAccessToken: getAccessToken,
        user,
        authInitialized,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

// Define the useAuth hook
export const useAuth = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }

  return authContext;
};