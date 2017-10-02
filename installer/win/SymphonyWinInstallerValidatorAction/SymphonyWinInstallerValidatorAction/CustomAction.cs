using System;
using System.Text.RegularExpressions;
using Microsoft.Deployment.WindowsInstaller;

namespace SymphonyWinInstallerValidatorAction
{
    public class CustomActions
    {
        [CustomAction]
        public static ActionResult ValidatePodUrl(Session session)
        {            
            // Get the Pod url from the session
            string podUrl = session["POD_URL"];

            // Do some basic validation on the Pod Url
            if (String.IsNullOrEmpty(podUrl))
            {
                session["INVALID_POD_URL"] = "invalid";
            }

            const string pattern = @"^((?:http:\/\/)|(?:https:\/\/))(www.)?((?:[a-zA-Z0-9]+\.[a-z]{3})|(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?))([\/a-zA-Z0-9\.]*)$";
            var match = Regex.Match(podUrl, pattern, RegexOptions.IgnoreCase);

            // Validate against the regular expression
            if (!match.Success)
            {                
                session["INVALID_POD_URL"] = "invalid";
            } else
            {
                session["INVALID_POD_URL"] = "valid";
            }

            // Set the check box labels' values
            SetCheckBoxLabelsValues(session);

            return ActionResult.Success;
        }

        [CustomAction]
        public static ActionResult SetCheckBoxValues(Session session)
        {                                   

            // If always on top is checked in the checkbox, set the value to true
            if (!String.IsNullOrWhiteSpace(session["ALWAYS_ON_TOP"]) && session["ALWAYS_ON_TOP"].Equals("true"))
            {
                session["ALWAYS_ON_TOP"] = "true";
            } else
            {
                session["ALWAYS_ON_TOP"] = "false";
            }

            // If launch on startup is checked in the checkbox, set the value to true
            if (!String.IsNullOrWhiteSpace(session["AUTO_START"]) && session["AUTO_START"].Equals("true"))
            {
                session["AUTO_START"] = "true";
            } else
            {
                session["AUTO_START"] = "false";
            }

            // If minimise on close is checked in the checkbox, set the value to true
            if (!String.IsNullOrWhiteSpace(session["MINIMIZE_ON_CLOSE"]) && session["MINIMIZE_ON_CLOSE"].Equals("true"))
            {
                session["MINIMIZE_ON_CLOSE"] = "true";
            } else
            {
                session["MINIMIZE_ON_CLOSE"] = "false";
            }

            return ActionResult.Success;

        }

        private static void SetCheckBoxLabelsValues(Session session)
        {

            // By default, we set all the values to false and change based on conditions
            session["ALWAYS_ON_TOP_LABEL"] = "false";            
            session["AUTO_START_LABEL"] = "false";
            session["MINIMIZE_ON_CLOSE_LABEL"] = "false";

            // If always on top is checked in the checkbox, set the label value to true
            if (!String.IsNullOrWhiteSpace(session["ALWAYS_ON_TOP"]) && session["ALWAYS_ON_TOP"].Equals("true"))
            {
                session["ALWAYS_ON_TOP_LABEL"] = "true";
            }

            // If launch on startup is checked in the checkbox, set the label value to true
            if (!String.IsNullOrWhiteSpace(session["AUTO_START"]) && session["AUTO_START"].Equals("true"))
            {
                session["AUTO_START_LABEL"] = "true";
            }

            // If minimise on close is checked in the checkbox, set the label value to true
            if (!String.IsNullOrWhiteSpace(session["MINIMIZE_ON_CLOSE"]) && session["MINIMIZE_ON_CLOSE"].Equals("true"))
            {
                session["MINIMIZE_ON_CLOSE_LABEL"] = "true";
            }
        }

    }
}
