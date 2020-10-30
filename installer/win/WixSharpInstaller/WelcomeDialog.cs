using WixSharp;
using System.Drawing;

namespace Symphony
{
    public partial class WelcomeDialog : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {
        // Helper function to retrive the user name of the current user. The user name returned from
        // windows can be on the form DOMAIN\USER or USER@DOMAIN. This function strips away the domain
        // name and separator, and returns the undecorated user name only.
        private string getUserName()
        {
            var name = System.Security.Principal.WindowsIdentity.GetCurrent().Name;
            var slashIndex = name.IndexOf("\\");
            return slashIndex > -1 ? name.Substring(slashIndex + 1) : name.Substring(0, name.IndexOf("@"));
        }

        public WelcomeDialog()
        {
            InitializeComponent();
        }

        void dialog_Load(object sender, System.EventArgs e)
        {
            // Populate the dynamic UI elements that can't be set at compile time (background image and
            // the label containing user name)
            this.backgroundPanel.BackgroundImage = Runtime.Session.GetResourceBitmap("WixUI_Bmp_Dialog");
            this.radioButtonCurrentUser.Text = "Only for me (" + getUserName() + ")";
            if( Runtime.Session["ALLUSERS"] != "" )
            {
                this.radioButtonAllUsers.Checked = true;
            }
            else
            {
               this.radioButtonCurrentUser.Checked = true;
            }

            // Detect if Symphony is running
            bool isRunning = System.Diagnostics.Process.GetProcessesByName("Symphony").Length > 1;
            if (!isRunning)
            {
                // If it is not running, change the label of the "Next" button to "Install" as the CloseDialog will be skipped
                this.next.Text = "Install";
            }
        }

        void next_Click(object sender, System.EventArgs e)
        {
            // To enable Wix to use the "MSIINSTALLPERUSER" property being set below, ALLUSERS must be set to 2
            Runtime.Session["ALLUSERS"] = "2";


            if (radioButtonCurrentUser.Checked)
            {
                // Install for current user
                Runtime.Session["MSIINSTALLPERUSER"] = "1"; // per-user
                Runtime.Session["INSTALLDIR"] = System.Environment.ExpandEnvironmentVariables(@"%LOCALAPPDATA%\Programs\Symphony\" + Runtime.ProductName);
            } else if (radioButtonAllUsers.Checked)
            {
                // Install for all users
                Runtime.Session["MSIINSTALLPERUSER"] = ""; // per-machine
                Runtime.Session["INSTALLDIR"] = Runtime.Session["PROGRAMSFOLDER"]  + @"\Symphony\" + Runtime.ProductName;
            }

            // Detect if Symphony is running
            bool isRunning = System.Diagnostics.Process.GetProcessesByName("Symphony").Length > 1;
            if (isRunning)
            {
                // If it is running, continue to the "Close Symphony" screen
                Shell.GoNext();
            }
            else
            {
                // If it is not running, proceed to progress dialog
                Shell.GoTo<Symphony.ProgressDialog>();
            }
        }

        void cancel_Click(object sender, System.EventArgs e)
        {
            if( System.Windows.Forms.MessageBox.Show("Are you sure you want to cancel Symphony installation?",
                "Symphony Setup", System.Windows.Forms.MessageBoxButtons.YesNo) == System.Windows.Forms.DialogResult.Yes )
            {
                Shell.Cancel();
            }
        }
    }
}