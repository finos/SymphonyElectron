using WixSharp;
using System.Drawing;

namespace Symphony
{
    public partial class CloseDialog : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {
        public CloseDialog()
        {
            InitializeComponent();
        }

        void dialog_Load(object sender, System.EventArgs e)
        {
            // Detect if Symphony is running
            bool isRunning = System.Diagnostics.Process.GetProcessesByName("Symphony").Length > 1;
            if (isRunning)
            {
                // If it is running, disable the "next" button
                this.next.Enabled = false;
            }

            // Populate the dynamic UI elements that can't be set at compile time (background image and
            // the enabled/disabled state of the `Close Symphony` button)
            this.backgroundPanel.BackgroundImage = Runtime.Session.GetResourceBitmap("WixUI_Bmp_Dialog");
        }

        void closeButton_Click(object sender, System.EventArgs e)
        {
            // The "Close Symphony" button is just to get users consent to close the app.
            // Actually closing the app will be done later in the flow.
            Shell.GoNext();
        }

        void next_Click(object sender, System.EventArgs e)
        {
            Shell.GoNext();
        }

        void cancel_Click(object sender, System.EventArgs e)
        {
            // TODO: Localization
            if( System.Windows.Forms.MessageBox.Show("Are you sure you want to cancel Symphony installation?",
                "Symphony Setup", System.Windows.Forms.MessageBoxButtons.YesNo) == System.Windows.Forms.DialogResult.Yes )
            {
                Shell.Cancel();
            }
        }

    }
}