using WixSharp;
using System.Drawing;

namespace Symphony
{
    public partial class MaintenanceDialog : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {
        public MaintenanceDialog()
        {
            InitializeComponent();
        }

        void dialog_Load(object sender, System.EventArgs e)
        {
            // Populate the dynamic UI elements that can't be set at compile time (background image)
            this.backgroundPanel.BackgroundImage = Runtime.Session.GetResourceBitmap("WixUI_Bmp_Dialog");
        }

        void next_Click(object sender, System.EventArgs e)
        {
            Shell.GoNext();
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