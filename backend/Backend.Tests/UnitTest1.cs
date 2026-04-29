namespace Backend.Tests;

public class UnitTest1
{
    [Fact]
    public void Test1()
    {
        // Arrange
        var expected = 5;
        var actual = 2 + 3;

        // Act & Assert
        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Test2()
    {
        // Arrange
        var expected = "Hello, World!";
        var actual = string.Concat("Hello", ", World!");

        // Act & Assert
        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Test3()
    {
        // Arrange
        var numbers = new[] { 1, 2, 3, 4, 5 };

        // Act
        var sum = numbers.Sum();

        // Assert
        Assert.Equal(15, sum);
    }
}