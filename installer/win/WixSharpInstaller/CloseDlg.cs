using WixSharp;
using System.Drawing;

namespace Symphony
{
    public partial class CloseDlg : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {

        public CloseDlg()
        {
            InitializeComponent();
        }

        void dialog_Load(object sender, System.EventArgs e)
        {
            // Detect if Symphony is running
            bool isRunning = System.Diagnostics.Process.GetProcessesByName("Symphony").Length > 0;
            if (isRunning)
            {
                // If it is running, disable the "next" button
                this.next.Enabled = false;
            }
            else
            {
                // If it is not running, skip this dialog
                Shell.GoNext();
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

        void back_Click(object sender, System.EventArgs e)
        {
            Shell.GoPrev();
        }

        void next_Click(object sender, System.EventArgs e)
        {
            Shell.GoNext();
        }

        void cancel_Click(object sender, System.EventArgs e)
        {
            Shell.Cancel();
        }

    }
}